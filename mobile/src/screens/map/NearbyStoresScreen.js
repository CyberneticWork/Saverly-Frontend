import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { supermarketsAPI } from '../../services/api';
import { colors, typography, shadows, spacing } from '../../theme';

// Dynamic import for WebView on native
let WebView = null;
let NativeMapView = null;
let NativeMarker = null;

if (Platform.OS !== 'web') {
  try {
    const wvModule = require('react-native-webview');
    WebView = wvModule.WebView || wvModule.default || wvModule;
  } catch (err) {
    console.warn('react-native-webview not loaded:', err);
  }

  try {
    const maps = require('react-native-maps');
    NativeMapView = maps.default || maps.MapView;
    NativeMarker = maps.Marker;
  } catch (err) {
    console.warn('react-native-maps not loaded:', err);
  }
}

// Fallback coordinates: Colombo, Sri Lanka
const DEFAULT_COORDS = { latitude: 6.9271, longitude: 79.8612 };

export default function NearbyStoresScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(DEFAULT_COORDS);
  const [isUsingGps, setIsUsingGps] = useState(false);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [radius, setRadius] = useState(25); // km
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('hybrid'); // 'hybrid' | 'list'

  // Fetch nearby stores from backend
  const fetchNearbyStores = useCallback(async (lat, lng, rad) => {
    try {
      setIsLoading(true);
      const res = await supermarketsAPI.getNearby({
        lat: lat || DEFAULT_COORDS.latitude,
        lng: lng || DEFAULT_COORDS.longitude,
        radius: rad,
      });

      const data = res?.data?.data || [];
      setStores(data);
      if (data.length > 0 && !selectedStore) {
        setSelectedStore(data[0]);
      }
    } catch (err) {
      console.warn('Error fetching nearby stores:', err);
    } finally {
      setIsLoading(false);
      setIsGpsLoading(false);
    }
  }, [selectedStore]);

  // Request GPS location
  const requestLocation = useCallback(async () => {
    setIsGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (loc?.coords) {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setLocation(coords);
          setIsUsingGps(true);
          fetchNearbyStores(coords.latitude, coords.longitude, radius);
          return;
        }
      }
    } catch (err) {
      console.warn('Location detection failed or dismissed:', err);
    }
    // Fallback if denied or unavailable
    setIsUsingGps(false);
    fetchNearbyStores(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, radius);
  }, [radius, fetchNearbyStores]);

  // Initial mount
  useEffect(() => {
    requestLocation();
  }, []);

  // Web iframe postMessage listener for marker clicks
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleMessage = (e) => {
        if (e.data?.type === 'STORE_SELECTED' && e.data?.storeId) {
          const found = stores.find(s => s.id === e.data.storeId);
          if (found) setSelectedStore(found);
        }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [stores]);

  // Filter stores by search query
  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return stores;
    const q = searchQuery.toLowerCase().trim();
    return stores.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.supermarketName && s.supermarketName.toLowerCase().includes(q)) ||
      (s.city && s.city.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q))
    );
  }, [stores, searchQuery]);

  // Open directions in Google Maps
  const openDirections = (store) => {
    if (!store?.latitude || !store?.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
    Linking.openURL(url);
  };

  // Navigate to store catalog
  const openStorePrices = (store) => {
    const smId = store.supermarketId || store.supermarket?.id;
    if (navigation.canGoBack() && navigation.getState()?.routes?.some(r => r.name === 'CommunityPrices')) {
      navigation.navigate('CommunityPrices', { supermarketId: smId });
    } else {
      navigation.navigate('Search', { screen: 'SearchMain', params: { supermarketId: smId } });
    }
  };

  // Generate web OpenStreetMap HTML with Leaflet
  const webMapHtml = useMemo(() => {
    const centerLat = selectedStore?.latitude || location.latitude;
    const centerLng = selectedStore?.longitude || location.longitude;

    const storesJson = JSON.stringify(
      filteredStores.map(s => ({
        id: s.id,
        name: s.name || s.supermarketName || 'Supermarket',
        chain: s.supermarketChain || s.supermarketName || 'Store',
        lat: s.latitude,
        lng: s.longitude,
        address: s.address || '',
        distance: s.distance != null ? s.distance.toFixed(1) : null,
        color: s.primaryColor || '#1C9A76',
        isSelected: selectedStore?.id === s.id,
      }))
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #e5e7eb; }
    .store-pin {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 16px;
      border: 3px solid #fff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .store-pin.selected {
      transform: scale(1.25);
      border-color: #FFA11A;
      box-shadow: 0 6px 16px rgba(0,0,0,0.5);
    }
    .user-pin {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #2563EB;
      border: 3px solid #fff;
      box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.35);
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      padding: 6px;
    }
    .popup-box {
      min-width: 190px;
    }
    .popup-name {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 2px;
    }
    .popup-chain {
      font-size: 11px;
      font-weight: 600;
      color: #1C9A76;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .popup-dist {
      font-size: 12px;
      color: #4B5563;
      margin-bottom: 8px;
      font-weight: 500;
    }
    .popup-dir-btn {
      display: inline-block;
      background: #1C9A76;
      color: #fff;
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const stores = ${storesJson};
    const center = [${centerLat}, ${centerLng}];
    const map = L.map('map', { zoomControl: true }).setView(center, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // User location marker
    const userIcon = L.divIcon({
      className: '',
      html: '<div class="user-pin"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    L.marker([${location.latitude}, ${location.longitude}], { icon: userIcon })
      .addTo(map)
      .bindPopup('<b>Your Location</b>');

    // Store markers
    const markers = [];
    stores.forEach(s => {
      const pinColor = s.color || '#1C9A76';
      const icon = L.divIcon({
        className: '',
        html: '<div class="store-pin ' + (s.isSelected ? 'selected' : '') + '" style="background-color: ' + pinColor + '">🛒</div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const m = L.marker([s.lat, s.lng], { icon: icon }).addTo(map);
      markers.push(m);

      const popupHtml = '<div class="popup-box">' +
        '<div class="popup-name">' + s.name + '</div>' +
        '<div class="popup-chain">' + s.chain + '</div>' +
        (s.distance ? '<div class="popup-dist">📍 ' + s.distance + ' km away</div>' : '') +
        (s.address ? '<div class="popup-dist">' + s.address + '</div>' : '') +
        '<a class="popup-dir-btn" href="https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng + '" target="_blank">Get Directions ↗</a>' +
        '</div>';
      m.bindPopup(popupHtml);

      m.on('click', () => {
        const payload = JSON.stringify({ type: 'STORE_SELECTED', storeId: s.id });
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(payload);
        } else if (window.parent) {
          window.parent.postMessage({ type: 'STORE_SELECTED', storeId: s.id }, '*');
        }
      });
    });

    if (markers.length > 0) {
      const group = L.featureGroup([
        L.marker([${location.latitude}, ${location.longitude}]),
        ...markers
      ]);
      map.fitBounds(group.getBounds().pad(0.12));
    }
  </script>
</body>
</html>
    `;
  }, [filteredStores, location, selectedStore]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* ── Top App Bar ── */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('Home', { screen: 'HomeMain' });
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Nearby Stores</Text>
            <Text style={styles.headerSubtitle}>
              {filteredStores.length} {filteredStores.length === 1 ? 'store' : 'stores'} found within {radius}km
            </Text>
          </View>

          {/* View mode toggle */}
          <View style={styles.modeToggleWrap}>
            <TouchableOpacity
              style={[styles.modeBtn, viewMode === 'hybrid' && styles.modeBtnActive]}
              onPress={() => setViewMode('hybrid')}
              activeOpacity={0.7}
            >
              <Ionicons name="map-outline" size={17} color={viewMode === 'hybrid' ? colors.primary : '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, viewMode === 'list' && styles.modeBtnActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.7}
            >
              <Ionicons name="list-outline" size={17} color={viewMode === 'list' ? colors.primary : '#fff'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stores by name, chain, or city..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Radius Filter Pills & GPS Status Row ── */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radiusPills}>
          {[5, 10, 25, 50].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusPill, radius === r && styles.radiusPillActive]}
              onPress={() => {
                setRadius(r);
                fetchNearbyStores(location.latitude, location.longitude, r);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.radiusPillText, radius === r && styles.radiusPillTextActive]}>
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.gpsBtn, isUsingGps && styles.gpsBtnActive]}
          onPress={requestLocation}
          disabled={isGpsLoading}
          activeOpacity={0.7}
        >
          {isGpsLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={isUsingGps ? 'navigate' : 'navigate-outline'} size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.gpsBtnText}>{isUsingGps ? 'GPS On' : 'Use GPS'}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── GPS Notice Banner (when using default Colombo) ── */}
      {!isUsingGps && (
        <View style={styles.noticeBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#0D9488" />
          <Text style={styles.noticeText}>
            Showing stores near Colombo. Tap "Use GPS" to detect your live location.
          </Text>
        </View>
      )}

      {/* ── Content Body ── */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading nearby supermarket stores...</Text>
        </View>
      ) : viewMode === 'list' ? (
        /* ── Full List View ── */
        <FlatList
          data={filteredStores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="storefront-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Stores Found</Text>
              <Text style={styles.emptySubtitle}>
                Try widening your search radius or clearing the search keyword.
              </Text>
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={() => {
                  setSearchQuery('');
                  setRadius(50);
                  fetchNearbyStores(location.latitude, location.longitude, 50);
                }}
              >
                <Text style={styles.emptyResetText}>View All Stores</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.listCard}>
              <View style={styles.listCardTop}>
                <View
                  style={[
                    styles.storeLogoBox,
                    { backgroundColor: item.primaryColor ? `${item.primaryColor}18` : colors.primaryFaded },
                  ]}
                >
                  <Ionicons name="storefront" size={24} color={item.primaryColor || colors.primary} />
                </View>
                <View style={styles.listCardInfo}>
                  <Text style={styles.listCardName}>{item.name}</Text>
                  <Text style={styles.listCardChain}>{item.supermarketChain || item.supermarketName}</Text>
                  {item.distance != null && (
                    <Text style={styles.listCardDist}>📍 {item.distance.toFixed(1)} km away</Text>
                  )}
                  {item.address ? (
                    <Text style={styles.listCardAddr} numberOfLines={2}>
                      {item.address}
                    </Text>
                  ) : null}
                  {item.phone ? (
                    <Text style={styles.listCardPhone}>📞 {item.phone}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.listCardActions}>
                <TouchableOpacity
                  style={styles.directionsBtn}
                  onPress={() => openDirections(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={15} color="#fff" />
                  <Text style={styles.directionsBtnText}>Directions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pricesBtn}
                  onPress={() => openStorePrices(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
                  <Text style={styles.pricesBtnText}>View Prices</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        /* ── Hybrid View: Map (Web / Mobile) + Carousel ── */
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <iframe
              title="Nearby Stores Map"
              srcDoc={webMapHtml}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          ) : WebView ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: webMapHtml }}
              style={styles.nativeMap}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data?.type === 'STORE_SELECTED' && data.storeId) {
                    const found = stores.find(s => s.id === data.storeId);
                    if (found) setSelectedStore(found);
                  }
                } catch (err) {}
              }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
            />
          ) : NativeMapView ? (
            <NativeMapView
              ref={mapRef}
              style={styles.nativeMap}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }}
              showsUserLocation
              showsMyLocationButton
            >
              {filteredStores.map((store) => (
                <NativeMarker
                  key={store.id}
                  coordinate={{ latitude: store.latitude, longitude: store.longitude }}
                  title={store.name}
                  description={`${store.distance?.toFixed(1)} km away`}
                  pinColor={store.primaryColor || colors.primary}
                  onPress={() => setSelectedStore(store)}
                />
              ))}
            </NativeMapView>
          ) : (
            <View style={styles.centerLoading}>
              <Text>Map component not supported on this platform.</Text>
            </View>
          )}

          {/* ── Floating Store Carousel at Bottom of Map ── */}
          {filteredStores.length > 0 && (
            <View style={styles.carouselWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselScroll}
              >
                {filteredStores.map((store) => {
                  const isSelected = selectedStore?.id === store.id;
                  return (
                    <TouchableOpacity
                      key={store.id}
                      style={[styles.carouselCard, isSelected && styles.carouselCardActive]}
                      onPress={() => setSelectedStore(store)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.carouselCardHeader}>
                        <View
                          style={[
                            styles.carouselIconBg,
                            {
                              backgroundColor: store.primaryColor
                                ? `${store.primaryColor}20`
                                : colors.primaryFaded,
                            },
                          ]}
                        >
                          <Ionicons
                            name="storefront"
                            size={18}
                            color={store.primaryColor || colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.carouselCardName} numberOfLines={1}>
                            {store.name}
                          </Text>
                          <Text style={styles.carouselCardChain} numberOfLines={1}>
                            {store.supermarketChain || store.supermarketName}
                          </Text>
                        </View>
                        {store.distance != null && (
                          <View style={styles.carouselDistBadge}>
                            <Text style={styles.carouselDistText}>
                              {store.distance.toFixed(1)} km
                            </Text>
                          </View>
                        )}
                      </View>

                      {store.address ? (
                        <Text style={styles.carouselAddr} numberOfLines={1}>
                          📍 {store.address}
                        </Text>
                      ) : null}

                      <View style={styles.carouselBtnRow}>
                        <TouchableOpacity
                          style={styles.carouselDirBtn}
                          onPress={() => openDirections(store)}
                        >
                          <Ionicons name="navigate" size={13} color="#fff" />
                          <Text style={styles.carouselDirBtnText}>Directions</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.carouselPriceBtn}
                          onPress={() => openStorePrices(store)}
                        >
                          <Ionicons name="pricetag-outline" size={13} color={colors.primary} />
                          <Text style={styles.carouselPriceBtnText}>Prices</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: '#fff',
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.caption,
    color: '#D1FAE5',
    marginTop: 2,
  },
  modeToggleWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 2,
  },
  modeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...typography.body,
    color: colors.text,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 8,
  },
  radiusPills: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  radiusPillActive: {
    backgroundColor: colors.primary,
  },
  radiusPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  radiusPillTextActive: {
    color: '#fff',
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0D9488',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  gpsBtnActive: {
    backgroundColor: '#059669',
  },
  gpsBtnText: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '600',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
  },
  noticeText: {
    ...typography.caption,
    color: '#0F766E',
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  nativeMap: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  carouselWrapper: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  carouselScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  carouselCard: {
    width: 270,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    ...shadows.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  carouselCardActive: {
    borderColor: colors.primary,
  },
  carouselCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  carouselIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselCardName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  carouselCardChain: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  carouselDistBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  carouselDistText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  carouselAddr: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: 10,
  },
  carouselBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  carouselDirBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  carouselDirBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  carouselPriceBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  carouselPriceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  listCardTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  storeLogoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listCardInfo: {
    flex: 1,
  },
  listCardName: {
    ...typography.h4,
    color: colors.text,
  },
  listCardChain: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  listCardDist: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 3,
  },
  listCardAddr: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: 4,
  },
  listCardPhone: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: 2,
  },
  listCardActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 12,
  },
  directionsBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  directionsBtnText: {
    ...typography.button,
    color: '#fff',
  },
  pricesBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  pricesBtnText: {
    ...typography.button,
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyResetBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyResetText: {
    ...typography.button,
    color: '#fff',
  },
});
