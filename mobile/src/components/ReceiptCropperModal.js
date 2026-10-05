import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  PanResponder,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

const MIN_CROP_SIZE = 50;
const CORNER_ACCENT_SIZE = 22;
const TOUCH_TARGET_SIZE = 48;

export default function ReceiptCropperModal({
  visible,
  imageUri,
  onClose,
  onSaveCrop,
}) {
  const insets = useSafeAreaInsets();
  const [currentUri, setCurrentUri] = useState(imageUri);
  const [imageDims, setImageDims] = useState({ width: 0, height: 0 });
  const [viewportDims, setViewportDims] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAspect, setActiveAspect] = useState('free');

  // Crop box in coordinates relative to the imageFrame (0, 0, frameW, frameH)
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const cropBoxRef = useRef(cropBox);
  cropBoxRef.current = cropBox;
  const startDragRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // When modal becomes visible or imageUri changes: load dimensions immediately
  useEffect(() => {
    if (!visible || !imageUri) return;
    setCurrentUri(imageUri);
    setActiveAspect('free');

    Image.getSize(
      imageUri,
      (w, h) => {
        setImageDims({ width: w, height: h });
      },
      (err) => {
        console.warn('Image.getSize error:', err);
      }
    );
  }, [visible, imageUri]);

  // Compute imageFrame geometry inside the viewport
  const maxW = Math.max(100, viewportDims.width - 24);
  const maxH = Math.max(100, viewportDims.height - 24);

  const imgRatio =
    imageDims.width > 0 && imageDims.height > 0
      ? imageDims.width / imageDims.height
      : 0.75;

  let frameW = 0;
  let frameH = 0;

  if (maxW > 0 && maxH > 0 && imageDims.width > 0 && imageDims.height > 0) {
    if (maxW / maxH > imgRatio) {
      // Taller image: constrained by maxH
      frameH = Math.round(maxH);
      frameW = Math.round(maxH * imgRatio);
    } else {
      // Wider image: constrained by maxW
      frameW = Math.round(maxW);
      frameH = Math.round(maxW / imgRatio);
    }
  }

  const frameWRef = useRef(frameW);
  frameWRef.current = frameW;
  const frameHRef = useRef(frameH);
  frameHRef.current = frameH;

  // Initialize crop box to frame the receipt once frame dimensions are calculated
  useEffect(() => {
    if (frameW > 0 && frameH > 0) {
      const margin = 10;
      setCropBox({
        x: margin,
        y: margin,
        width: Math.max(MIN_CROP_SIZE, frameW - margin * 2),
        height: Math.max(MIN_CROP_SIZE, frameH - margin * 2),
      });
      setActiveAspect('free');
    }
  }, [frameW, frameH]);

  // ── PanResponders (All relative to imageFrame) ─────────────────────────────

  // Move entire crop box
  const boxPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startDragRef.current = { ...cropBoxRef.current };
      },
      onPanResponderMove: (evt, gesture) => {
        const start = startDragRef.current;
        const fw = frameWRef.current;
        const fh = frameHRef.current;
        const maxX = fw - start.width;
        const maxY = fh - start.height;
        const newX = Math.max(0, Math.min(maxX, start.x + gesture.dx));
        const newY = Math.max(0, Math.min(maxY, start.y + gesture.dy));
        setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
      },
    })
  ).current;

  // Top-Left corner resize
  const tlPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startDragRef.current = { ...cropBoxRef.current };
      },
      onPanResponderMove: (evt, gesture) => {
        const start = startDragRef.current;
        const maxX = start.x + start.width - MIN_CROP_SIZE;
        const maxY = start.y + start.height - MIN_CROP_SIZE;
        const newX = Math.max(0, Math.min(maxX, start.x + gesture.dx));
        const newY = Math.max(0, Math.min(maxY, start.y + gesture.dy));
        const newW = start.width - (newX - start.x);
        const newH = start.height - (newY - start.y);
        setCropBox({ x: newX, y: newY, width: newW, height: newH });
      },
    })
  ).current;

  // Top-Right corner resize
  const trPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startDragRef.current = { ...cropBoxRef.current };
      },
      onPanResponderMove: (evt, gesture) => {
        const start = startDragRef.current;
        const fw = frameWRef.current;
        const maxY = start.y + start.height - MIN_CROP_SIZE;
        const newY = Math.max(0, Math.min(maxY, start.y + gesture.dy));
        const maxW = fw - start.x;
        const newW = Math.max(MIN_CROP_SIZE, Math.min(maxW, start.width + gesture.dx));
        const newH = start.height - (newY - start.y);
        setCropBox({ x: start.x, y: newY, width: newW, height: newH });
      },
    })
  ).current;

  // Bottom-Left corner resize
  const blPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startDragRef.current = { ...cropBoxRef.current };
      },
      onPanResponderMove: (evt, gesture) => {
        const start = startDragRef.current;
        const fh = frameHRef.current;
        const maxX = start.x + start.width - MIN_CROP_SIZE;
        const newX = Math.max(0, Math.min(maxX, start.x + gesture.dx));
        const newW = start.width - (newX - start.x);
        const maxH = fh - start.y;
        const newH = Math.max(MIN_CROP_SIZE, Math.min(maxH, start.height + gesture.dy));
        setCropBox({ x: newX, y: start.y, width: newW, height: newH });
      },
    })
  ).current;

  // Bottom-Right corner resize
  const brPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startDragRef.current = { ...cropBoxRef.current };
      },
      onPanResponderMove: (evt, gesture) => {
        const start = startDragRef.current;
        const fw = frameWRef.current;
        const fh = frameHRef.current;
        const maxW = fw - start.x;
        const maxH = fh - start.y;
        const newW = Math.max(MIN_CROP_SIZE, Math.min(maxW, start.width + gesture.dx));
        const newH = Math.max(MIN_CROP_SIZE, Math.min(maxH, start.height + gesture.dy));
        setCropBox({ x: start.x, y: start.y, width: newW, height: newH });
      },
    })
  ).current;

  // ── Actions ────────────────────────────────────────────────────────────────

  // Rotate 90° clockwise
  const handleRotate = async () => {
    if (!currentUri || isProcessing) return;
    try {
      setIsProcessing(true);
      const res = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ rotate: 90 }],
        { format: ImageManipulator.SaveFormat.JPEG }
      );
      setCurrentUri(res.uri);
      setImageDims({ width: res.width, height: res.height });
    } catch (err) {
      console.error('Rotate error:', err);
      Alert.alert('Error', 'Could not rotate image.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Preset aspect ratio selector
  const applyPresetAspect = (preset) => {
    setActiveAspect(preset);
    const fw = frameWRef.current;
    const fh = frameHRef.current;
    if (fw <= 0 || fh <= 0) return;

    let targetW = fw * 0.9;
    let targetH = fh * 0.9;

    if (preset === 'receipt') {
      // Tall receipt ratio (1:2.2)
      targetW = Math.min(fw * 0.85, fh / 2.2);
      targetH = Math.min(fh * 0.95, targetW * 2.2);
    } else if (preset === 'document') {
      // Standard document 3:4
      targetW = Math.min(fw * 0.85, (fh * 0.85 * 3) / 4);
      targetH = (targetW * 4) / 3;
    } else if (preset === 'square') {
      // 1:1 square
      const s = Math.min(fw * 0.85, fh * 0.85);
      targetW = s;
      targetH = s;
    } else {
      // Full image
      targetW = fw * 0.96;
      targetH = fh * 0.96;
    }

    const newX = (fw - targetW) / 2;
    const newY = (fh - targetH) / 2;

    setCropBox({
      x: Math.max(0, newX),
      y: Math.max(0, newY),
      width: Math.min(fw, targetW),
      height: Math.min(fh, targetH),
    });
  };

  // Apply crop and output high-res image
  const handleSaveCrop = async () => {
    const fw = frameWRef.current;
    const fh = frameHRef.current;
    if (!currentUri || isProcessing || fw <= 0 || fh <= 0) return;

    try {
      setIsProcessing(true);
      const scaleX = imageDims.width / fw;
      const scaleY = imageDims.height / fh;

      const originX = Math.max(
        0,
        Math.min(imageDims.width - 20, Math.round(cropBox.x * scaleX))
      );
      const originY = Math.max(
        0,
        Math.min(imageDims.height - 20, Math.round(cropBox.y * scaleY))
      );
      const cropW = Math.max(
        20,
        Math.min(imageDims.width - originX, Math.round(cropBox.width * scaleX))
      );
      const cropH = Math.max(
        20,
        Math.min(imageDims.height - originY, Math.round(cropBox.height * scaleY))
      );

      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ crop: { originX, originY, width: cropW, height: cropH } }],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
      );

      onSaveCrop(result.uri);
      onClose();
    } catch (err) {
      console.error('Crop save error:', err);
      Alert.alert('Crop Error', 'Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible) return null;

  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 48 : 24);
  const bottomInset = Math.max(insets.bottom, 16);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.modalRoot, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        {/* Top Header - Safe from Dynamic Island & Notch */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Crop Receipt</Text>
            <Text style={styles.headerSubtitle}>Drag box or corners to frame receipt</Text>
          </View>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleRotate}
            activeOpacity={0.7}
            disabled={isProcessing}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="refresh-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Center Viewport */}
        <View
          style={styles.viewport}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setViewportDims({ width, height });
          }}
        >
          {currentUri && frameW > 0 && frameH > 0 ? (
            <View style={[styles.imageFrame, { width: frameW, height: frameH }]}>
              {/* Underlying Image - fills imageFrame exactly */}
              <Image
                source={{ uri: currentUri }}
                style={{ width: frameW, height: frameH }}
                resizeMode="cover"
              />

              {/* Dimmed Surrounding Mask Panels */}
              <View
                pointerEvents="none"
                style={[
                  styles.maskPanel,
                  { top: 0, left: 0, right: 0, height: Math.max(0, cropBox.y) },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.maskPanel,
                  {
                    top: cropBox.y + cropBox.height,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.maskPanel,
                  {
                    top: cropBox.y,
                    left: 0,
                    width: Math.max(0, cropBox.x),
                    height: cropBox.height,
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.maskPanel,
                  {
                    top: cropBox.y,
                    left: cropBox.x + cropBox.width,
                    right: 0,
                    height: cropBox.height,
                  },
                ]}
              />

              {/* Movable & Resizable Crop Box */}
              <View
                style={[
                  styles.cropBox,
                  {
                    left: cropBox.x,
                    top: cropBox.y,
                    width: cropBox.width,
                    height: cropBox.height,
                  },
                ]}
                {...boxPanResponder.panHandlers}
              >
                {/* 3x3 Grid Lines */}
                <View style={styles.gridLineH1} />
                <View style={styles.gridLineH2} />
                <View style={styles.gridLineV1} />
                <View style={styles.gridLineV2} />

                {/* 4 Green Corner Brackets */}
                <View style={[styles.cornerAccent, styles.accentTL]} />
                <View style={[styles.cornerAccent, styles.accentTR]} />
                <View style={[styles.cornerAccent, styles.accentBL]} />
                <View style={[styles.cornerAccent, styles.accentBR]} />

                {/* Corner Touch Targets for Easy Resizing */}
                <View style={[styles.cornerTouch, styles.touchTL]} {...tlPanResponder.panHandlers} />
                <View style={[styles.cornerTouch, styles.touchTR]} {...trPanResponder.panHandlers} />
                <View style={[styles.cornerTouch, styles.touchBL]} {...blPanResponder.panHandlers} />
                <View style={[styles.cornerTouch, styles.touchBR]} {...brPanResponder.panHandlers} />
              </View>
            </View>
          ) : (
            <ActivityIndicator size="large" color="#10B981" />
          )}

          {isProcessing && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Processing receipt…</Text>
            </View>
          )}
        </View>

        {/* Aspect Ratio Presets Bar */}
        <View style={styles.presetsBar}>
          <TouchableOpacity
            style={[styles.presetBtn, activeAspect === 'receipt' && styles.presetBtnActive]}
            onPress={() => applyPresetAspect('receipt')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="receipt-outline"
              size={15}
              color={activeAspect === 'receipt' ? '#fff' : 'rgba(255,255,255,0.7)'}
            />
            <Text
              style={[
                styles.presetBtnText,
                activeAspect === 'receipt' && styles.presetBtnTextActive,
              ]}
            >
              Receipt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetBtn, activeAspect === 'document' && styles.presetBtnActive]}
            onPress={() => applyPresetAspect('document')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="document-text-outline"
              size={15}
              color={activeAspect === 'document' ? '#fff' : 'rgba(255,255,255,0.7)'}
            />
            <Text
              style={[
                styles.presetBtnText,
                activeAspect === 'document' && styles.presetBtnTextActive,
              ]}
            >
              Document
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetBtn, activeAspect === 'square' && styles.presetBtnActive]}
            onPress={() => applyPresetAspect('square')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="square-outline"
              size={15}
              color={activeAspect === 'square' ? '#fff' : 'rgba(255,255,255,0.7)'}
            />
            <Text
              style={[
                styles.presetBtnText,
                activeAspect === 'square' && styles.presetBtnTextActive,
              ]}
            >
              Square
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetBtn, activeAspect === 'full' && styles.presetBtnActive]}
            onPress={() => applyPresetAspect('full')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="scan-outline"
              size={15}
              color={activeAspect === 'full' ? '#fff' : 'rgba(255,255,255,0.7)'}
            />
            <Text
              style={[
                styles.presetBtnText,
                activeAspect === 'full' && styles.presetBtnTextActive,
              ]}
            >
              Full
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Actions Bar */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => applyPresetAspect('full')}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.resetBtnText}>Reset Box</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={handleSaveCrop}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.doneBtnText}>Done & Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  viewport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageFrame: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  maskPanel: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'transparent',
  },
  gridLineH1: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridLineH2: {
    position: 'absolute',
    top: '66.66%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridLineV1: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridLineV2: {
    position: 'absolute',
    left: '66.66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  cornerAccent: {
    position: 'absolute',
    width: CORNER_ACCENT_SIZE,
    height: CORNER_ACCENT_SIZE,
    borderColor: '#10B981',
  },
  accentTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  accentTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
  },
  accentBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  accentBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
  },
  cornerTouch: {
    position: 'absolute',
    width: TOUCH_TARGET_SIZE,
    height: TOUCH_TARGET_SIZE,
    backgroundColor: 'transparent',
  },
  touchTL: {
    top: -TOUCH_TARGET_SIZE / 2,
    left: -TOUCH_TARGET_SIZE / 2,
  },
  touchTR: {
    top: -TOUCH_TARGET_SIZE / 2,
    right: -TOUCH_TARGET_SIZE / 2,
  },
  touchBL: {
    bottom: -TOUCH_TARGET_SIZE / 2,
    left: -TOUCH_TARGET_SIZE / 2,
  },
  touchBR: {
    bottom: -TOUCH_TARGET_SIZE / 2,
    right: -TOUCH_TARGET_SIZE / 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  presetsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  presetBtnActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  presetBtnTextActive: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  resetBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  doneBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: 12,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
