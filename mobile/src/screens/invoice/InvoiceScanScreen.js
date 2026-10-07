import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Image, ScrollView, Platform,
  StatusBar, BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, Camera } from 'expo-camera';
import { invoicesAPI } from '../../services/api';
import { colors, typography, shadows } from '../../theme';
import ReceiptCropperModal from '../../components/ReceiptCropperModal';

// ── On-device structured extraction via Gemini Vision ───────────────────────
// One single Gemini call returns JSON directly — no text→parse round-trip needed.
async function extractStructuredWithGemini(base64Image) {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const model = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) throw new Error('OCR service not configured. Contact support.');

  const prompt = `You are an expert invoice/receipt parser for Sri Lanka and South Asia.
This image may be ANY document type: thermal supermarket receipt, restaurant bill, A4/B5 printed invoice, handwritten bill, hotel invoice, pharmacy receipt, hardware store bill, etc.
It may contain English, Sinhala, Tamil, or mixed languages. Text may be faded, skewed, handwritten, or in table columns.

IMPORTANT receipt patterns to handle:
- Two-line items: item name on one line, prices (qty/MRP/rate/amount) on the NEXT line — link them together
- Inline items: "Item Name  qty x price = total" all on one line
- Column tables: QTY | DESCRIPTION | RATE | AMOUNT or ITEMS | QTY | MRP | RATE | AMOUNT
- Sinhala/Tamil product names: transliterate to English
- Handwritten amounts like "400/-" mean 400.00
- Prices with commas like "1,300.00" are normal numbers
- "*" separator between name and price on same line

Return ONLY valid JSON (no markdown, no code fences, no explanation):
{
  "storeName": "shop/company name or null",
  "date": "YYYY-MM-DD or null",
  "items": [
    { "name": "product or service name in English", "quantity": 1, "unitPrice": 0.00, "totalPrice": 0.00, "unit": null }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00
}

Rules:
- Include EVERY purchased item/service line — even if name is unclear, include best guess.
- Two-line format: combine the name from line N with prices from line N+1 as ONE item.
- Skip footer-only lines: Grand Total, Sub Total, Service Charge, VAT, NBT, Discount, Cash, Change, Rounding, Points, Thank You.
- NEVER null for numbers — use 0 if unknown.
- quantity defaults to 1. unitPrice = price per unit. totalPrice = qty × unitPrice.
- Prices in plain LKR numbers, no symbols.
- If only one price column visible, use it for both unitPrice and totalPrice.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
        ]}],
        generationConfig: { temperature: 0, maxOutputTokens: 4096 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OCR failed (${response.status})`);
  }

  const data = await response.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  if (!raw) throw new Error('No data returned from OCR service.');

  // Strip any accidental code fences
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed.items)) throw new Error('Invalid OCR response structure.');
  return parsed;
}

function extractInvoiceIdFromResponse(res) {
  const payload = res?.data?.data || res?.data || {};
  return payload.invoiceId || payload.id || payload?.invoice?.id || null;
}

export default function InvoiceScanScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('picker'); // 'picker' | 'camera'
  const [hasPermission, setHasPermission] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [isCropperVisible, setIsCropperVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const cameraRef = useRef(null);

  // Dynamically hide stack navigation header and bottom tab bar when in full-screen live camera mode
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: mode !== 'camera',
    });
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: mode === 'camera' ? { display: 'none' } : undefined,
      });
    }
    return () => {
      navigation.setOptions({ headerShown: true });
      if (parent) {
        parent.setOptions({ tabBarStyle: undefined });
      }
    };
  }, [navigation, mode]);

  // Handle hardware back press on Android in camera mode
  useEffect(() => {
    if (mode === 'camera') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        setMode('picker');
        return true;
      });
      return () => backHandler.remove();
    }
  }, [mode]);

  const handleImageSelected = (uri) => {
    if (!uri) return;
    setOriginalImage(uri);
    setSelectedImage(uri);
    setMode('picker');
    Alert.alert(
      'Receipt Captured',
      'Would you like to crop and straighten the receipt before scanning?',
      [
        { text: 'Crop Receipt', onPress: () => setIsCropperVisible(true) },
        { text: 'Continue as is', style: 'default' },
      ],
      { cancelable: true }
    );
  };

  const handleQuickRotate = async () => {
    if (!selectedImage) return;
    try {
      const res = await ImageManipulator.manipulateAsync(
        selectedImage,
        [{ rotate: 90 }],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
      );
      setSelectedImage(res.uri);
    } catch (err) {
      console.warn('Quick rotate failed:', err);
    }
  };

  const takeWithNativeCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera access is needed to photograph your receipt.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaType?.Images || ['images'],
        allowsEditing: false, // Capture full uncropped receipt
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        handleImageSelected(result.assets[0].uri);
      }
    } catch (err) {
      console.error('System camera error:', err);
      Alert.alert('Camera error', 'Failed to open camera.');
    }
  };

  const requestCamera = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status === 'granted') {
        setMode('camera');
      } else {
        Alert.alert(
          'Camera Permission',
          'Camera access is needed to scan receipts. You can also use the system camera or choose from gallery.',
          [
            { text: 'System Camera', onPress: takeWithNativeCamera },
            { text: 'Choose from Gallery', onPress: pickImage },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } catch (err) {
      console.warn('requestCamera error:', err);
      takeWithNativeCamera();
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType?.Images || ['images'],
      allowsEditing: false, // Keep full receipt image
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      handleImageSelected(result.assets[0].uri);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        handleImageSelected(photo.uri);
      }
    } catch (err) {
      console.error('Take picture error:', err);
      Alert.alert(
        'Capture Failed',
        'Could not capture photo using in-app camera. Would you like to use the system camera?',
        [
          { text: 'Use System Camera', onPress: takeWithNativeCamera },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) return;
    setIsUploading(true);
    setUploadStatus('Preparing image…');
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      let invoiceId = null;

      // 1. Try on-device Gemini if an API key is configured
      if (apiKey && apiKey.trim().length > 0) {
        try {
          setUploadStatus('Optimizing image…');
          let base64 = null;
          try {
            const img = await ImageManipulator.manipulateAsync(
              selectedImage,
              [{ resize: { width: 1600 } }],
              { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            base64 = img.base64;
          } catch (manipErr) {
            console.warn('ImageManipulator error, skipping client Gemini:', manipErr);
          }

          if (base64) {
            setUploadStatus('Reading invoice with Gemini…');
            const structured = await extractStructuredWithGemini(base64);
            setUploadStatus('Saving…');
            const res = await invoicesAPI.scanStructured(structured);
            invoiceId = extractInvoiceIdFromResponse(res);
          }
        } catch (geminiErr) {
          console.warn('Client Gemini failed, falling back to server OCR:', geminiErr?.message || geminiErr);
        }
      }

      // 2. Fallback to Server-Side OCR (Tesseract / Server pipeline)
      if (!invoiceId) {
        setUploadStatus('Processing image…');
        let uploadUri = selectedImage;
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            selectedImage,
            [{ resize: { width: 1600 } }],
            { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
          );
          if (manipulated?.uri) {
            uploadUri = manipulated.uri;
          }
        } catch (manipErr) {
          console.warn('ImageManipulator JPEG conversion error:', manipErr);
        }

        setUploadStatus('Uploading to server OCR…');
        const formData = new FormData();
        if (Platform.OS === 'web') {
          const resp = await fetch(uploadUri);
          const blob = await resp.blob();
          formData.append('invoice', blob, 'receipt.jpg');
        } else {
          formData.append('invoice', {
            uri: uploadUri,
            name: 'receipt.jpg',
            type: 'image/jpeg',
          });
        }

        const res = await invoicesAPI.scan(formData);
        invoiceId = extractInvoiceIdFromResponse(res);
      }

      if (!invoiceId) throw new Error('Unexpected response from server.');
      navigation.replace('InvoiceReview', { invoiceId });
    } catch (err) {
      console.error('Scan error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Please try again.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Scan failed: ${msg}`);
      } else {
        Alert.alert('Scan failed', msg);
      }
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  if (mode === 'camera') {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torchOn}
          ref={cameraRef}
        />

        {/* Fullscreen UI Overlay positioned on top of the native camera preview */}
        <View style={styles.cameraUI} pointerEvents="box-none">
          {/* Top Controls Bar */}
          <View style={[styles.cameraTopBar, { paddingTop: Math.max(insets.top + 8, 54) }]}>
            <TouchableOpacity
              style={styles.cameraRoundBtn}
              onPress={() => setMode('picker')}
              activeOpacity={0.7}
              accessibilityLabel="Close camera"
            >
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>

            <View style={styles.cameraTitlePill}>
              <Ionicons name="receipt-outline" size={16} color="#fff" />
              <Text style={styles.cameraTitleText}>Receipt Scanner</Text>
            </View>

            <TouchableOpacity
              style={[styles.cameraRoundBtn, torchOn && styles.cameraRoundBtnActive]}
              onPress={() => setTorchOn(prev => !prev)}
              activeOpacity={0.7}
              accessibilityLabel="Toggle flash"
            >
              <Ionicons name={torchOn ? 'flash' : 'flash-off'} size={22} color={torchOn ? '#FFD54F' : '#fff'} />
            </TouchableOpacity>
          </View>

          {/* Viewfinder Receipt Frame */}
          <View style={styles.cameraFrameWrapper} pointerEvents="none">
            <View style={styles.cameraFrame}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>
            <View style={styles.cameraHintBadge}>
              <Ionicons name="scan-outline" size={15} color="#fff" />
              <Text style={styles.cameraHintText}>Position receipt inside frame</Text>
            </View>
          </View>

          {/* Bottom Shutter & Actions Bar */}
          <View style={[styles.cameraBottomBar, { paddingBottom: Math.max(insets.bottom + 12, 34) }]}>
            <TouchableOpacity
              style={styles.cameraActionBtn}
              onPress={takeWithNativeCamera}
              activeOpacity={0.7}
              accessibilityLabel="Use system camera"
            >
              <View style={styles.cameraActionIcon}>
                <Ionicons name="camera-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.cameraActionLabel}>System</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shutterBtnOuter}
              onPress={takePicture}
              disabled={isCapturing}
              activeOpacity={0.8}
              accessibilityLabel="Take photo"
            >
              <View style={styles.shutterBtnInner}>
                {isCapturing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={32} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraActionBtn}
              onPress={() => {
                setMode('picker');
                pickImage();
              }}
              activeOpacity={0.7}
              accessibilityLabel="Pick from gallery"
            >
              <View style={styles.cameraActionIcon}>
                <Ionicons name="images-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.cameraActionLabel}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>

      {/* Interactive Receipt Cropper Modal */}
      <ReceiptCropperModal
        visible={isCropperVisible}
        imageUri={selectedImage || originalImage}
        onClose={() => setIsCropperVisible(false)}
        onSaveCrop={(croppedUri) => {
          setSelectedImage(croppedUri);
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.hero}>
          <Text style={styles.heroIcon}>📄</Text>
          <Text style={styles.heroTitle}>Scan Receipt</Text>
          <Text style={styles.heroSub}>Scan a grocery receipt and we'll automatically extract product prices to help you compare</Text>
        </LinearGradient>

        {selectedImage ? (
          <View style={styles.previewContainer}>
            <View style={styles.previewImageCard}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />
              {originalImage && originalImage !== selectedImage && (
                <View style={styles.croppedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.croppedBadgeText}>Cropped</Text>
                </View>
              )}
            </View>

            {/* Quick Actions Row */}
            <View style={styles.previewActionsGrid}>
              <TouchableOpacity
                style={styles.cropPrimaryBtn}
                onPress={() => setIsCropperVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="crop" size={18} color="#fff" />
                <Text style={styles.cropPrimaryBtnText}>Crop & Adjust</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cropSecondaryBtn}
                onPress={handleQuickRotate}
                activeOpacity={0.8}
              >
                <Ionicons name="reload" size={18} color={colors.primary} />
                <Text style={styles.cropSecondaryBtnText}>Rotate 90°</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.previewSubActionsRow}>
              {originalImage && originalImage !== selectedImage && (
                <TouchableOpacity
                  style={styles.previewSubBtn}
                  onPress={() => setSelectedImage(originalImage)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-undo-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.previewSubBtnText}>Reset to Original</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.previewSubBtn}
                onPress={() => {
                  setSelectedImage(null);
                  setOriginalImage(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={16} color={colors.textSecondary} />
                <Text style={styles.previewSubBtnText}>Choose Different Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.options}>
            {/* 1. Direct Native Camera (Recommended & Most Reliable) */}
            <TouchableOpacity style={styles.optionCard} onPress={takeWithNativeCamera} activeOpacity={0.8}>
              <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.optionIcon}>
                <Ionicons name="camera" size={32} color="#fff" />
              </LinearGradient>
              <View style={styles.optionInfo}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>Take a Photo</Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                </View>
                <Text style={styles.optionSub}>Opens camera with native shutter button</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>

            {/* 2. In-App Live Scanner */}
            <TouchableOpacity style={styles.optionCard} onPress={requestCamera} activeOpacity={0.8}>
              <LinearGradient colors={['#00796B', '#00897B']} style={styles.optionIcon}>
                <Ionicons name="scan-outline" size={32} color="#fff" />
              </LinearGradient>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Live Scanner View</Text>
                <Text style={styles.optionSub}>In-app viewfinder with receipt framing guide</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>

            {/* 3. Choose from Gallery */}
            <TouchableOpacity style={styles.optionCard} onPress={pickImage} activeOpacity={0.8}>
              <LinearGradient colors={['#0277BD', '#0288D1']} style={styles.optionIcon}>
                <Ionicons name="image" size={32} color="#fff" />
              </LinearGradient>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Choose from Gallery</Text>
                <Text style={styles.optionSub}>Select a receipt photo from your library</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>For best results:</Text>
          {[
            'Ensure receipt is flat and well-lit',
            'Capture the entire receipt',
            'Avoid shadows and glare',
            'Hold camera steady',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.viewHistoryBtn}
          onPress={() => navigation.navigate('InvoiceList')}
        >
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <Text style={styles.viewHistoryText}>View Scan History</Text>
        </TouchableOpacity>
      </ScrollView>

      {selectedImage && (
        <View style={styles.uploadBar}>
          <TouchableOpacity
            style={[styles.uploadBtn, isUploading && styles.uploadBtnDisabled]}
            onPress={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.uploadBtnText}>{uploadStatus || 'Scanning…'}</Text>
              </>
            ) : (
              <>
                <Ionicons name="scan" size={20} color="#fff" />
                <Text style={styles.uploadBtnText}>Scan & Extract Prices</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraUI: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 100,
    elevation: 100,
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 110,
  },
  cameraRoundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cameraRoundBtnActive: {
    backgroundColor: 'rgba(255,213,79,0.35)',
    borderColor: '#FFD54F',
  },
  cameraTitlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cameraTitleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cameraFrameWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  cameraFrame: {
    width: '84%',
    height: '75%',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 36,
    height: 36,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#10B981',
    borderTopLeftRadius: 20,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 36,
    height: 36,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#10B981',
    borderTopRightRadius: 20,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 36,
    height: 36,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#10B981',
    borderBottomLeftRadius: 20,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 36,
    height: 36,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#10B981',
    borderBottomRightRadius: 20,
  },
  cameraHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cameraHintText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  cameraBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 110,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingTop: 18,
  },
  shutterBtnOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  shutterBtnInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.primary || '#1B5E20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraActionBtn: {
    alignItems: 'center',
    gap: 6,
    width: 68,
  },
  cameraActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cameraActionLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  content: { paddingBottom: 100 },
  hero: { padding: 32, alignItems: 'center' },
  heroIcon: { fontSize: 56, marginBottom: 12 },
  heroTitle: { ...typography.h2, color: '#fff', textAlign: 'center' },
  heroSub: { ...typography.body, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8 },
  previewContainer: { padding: 20, alignItems: 'center', gap: 14 },
  previewImageCard: {
    width: '100%',
    height: 320,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  },
  previewImage: { width: '100%', height: '100%' },
  croppedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    ...shadows.xs,
  },
  croppedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  previewActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cropPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    ...shadows.sm,
  },
  cropPrimaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cropSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  cropSecondaryBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  previewSubActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  previewSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  previewSubBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  options: { padding: 20, gap: 16 },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 18, ...shadows.sm, gap: 14 },
  optionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  optionInfo: { flex: 1 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recommendedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  optionTitle: { ...typography.h4, color: colors.text },
  optionSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  tipsCard: { margin: 20, backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16, gap: 8 },
  tipsTitle: { ...typography.body, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipText: { ...typography.body, color: colors.text },
  viewHistoryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  viewHistoryText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  uploadBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
  uploadBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  uploadBtnDisabled: { opacity: 0.7 },
  uploadBtnText: { ...typography.button, color: '#fff' },
});
