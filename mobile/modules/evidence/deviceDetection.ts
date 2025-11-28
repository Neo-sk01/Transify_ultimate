import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { BleManager, Device as BleDevice } from 'react-native-ble-plx';
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import { DeviceInfo } from './types';

export interface DeviceScanResult {
  success: boolean;
  devices: DeviceInfo[];
  error?: string;
}

// Initialize BLE Manager
const bleManager = new BleManager();

/**
 * Scan for nearby Bluetooth devices
 * Requirements: 3.2, 3.3
 */
export async function scanBluetoothDevices(): Promise<DeviceScanResult> {
  const devices: DeviceInfo[] = [];
  const deviceMap = new Map<string, BleDevice>();

  try {
    // Check state first
    const state = await bleManager.state();
    if (state !== 'PoweredOn') {
      return { success: false, devices: [], error: `Bluetooth is ${state}` };
    }

    return new Promise((resolve) => {
      // Scan for 5 seconds
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('BLE Scan error:', error);
          // Don't reject, just resolve with what we have
          bleManager.stopDeviceScan();
          resolve({ success: false, devices: [], error: error.message });
          return;
        }

        if (device && device.id && !deviceMap.has(device.id)) {
          deviceMap.set(device.id, device);

          devices.push({
            type: 'bluetooth',
            identifier: device.id,
            name: device.name || 'Unknown',
            signalStrength: device.rssi || 0,
            timestamp: new Date(),
          });
        }
      });

      // Stop scanning after 5 seconds
      setTimeout(() => {
        bleManager.stopDeviceScan();
        resolve({ success: true, devices });
      }, 5000);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown BLE error';
    return { success: false, devices: [], error: errorMessage };
  }
}

/**
 * Scan for WiFi networks
 * Note: iOS has severe restrictions on scanning WiFi networks.
 * We can only get the current connection info.
 * Requirements: 3.2, 3.3
 */
export async function scanWifiNetworks(): Promise<DeviceScanResult> {
  try {
    const state = await NetInfo.fetch();
    const devices: DeviceInfo[] = [];

    if (state.type === NetInfoStateType.wifi && state.details) {
      // On Android, we might get more info. On iOS, we need 'Access WiFi Information' entitlement.
      // Note: 'ssid' might be null on iOS without location permission + entitlement
      const ssid = (state.details as any).ssid || 'Unknown SSID';
      const bssid = (state.details as any).bssid || 'Unknown BSSID';
      const strength = (state.details as any).strength || 100; // Signal strength not always available

      devices.push({
        type: 'wifi',
        identifier: bssid,
        name: ssid,
        signalStrength: strength,
        timestamp: new Date(),
      });
    }

    return { success: true, devices };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown WiFi error';
    return { success: false, devices: [], error: errorMessage };
  }
}

/**
 * Get current device information
 */
export function getCurrentDeviceInfo(): any {
  return {
    brand: Device.brand,
    manufacturer: Device.manufacturer,
    modelName: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
  };
}
