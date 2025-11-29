import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { CameraView, useCameraPermissions, CameraMode } from 'expo-camera';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { isCapturing } from '../modules/evidence';

interface StealthCameraProps {
  sessionId: string | null;
  onVideoRecorded?: (uri: string) => void;
  onAudioRecorded?: (uri: string) => void;
}

/**
 * Stealth Camera Component
 * 
 * Records video and audio when a session is active.
 * Designed to be invisible (1x1 pixel) to the user.
 * 
 * Note: OS privacy indicators (green/orange dot) will still be visible.
 */
export function StealthCamera({ sessionId, onVideoRecorded, onAudioRecorded }: StealthCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [audioPermission, requestAudioPermission] = Audio.usePermissions();
  const cameraRef = useRef<CameraView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    if (!audioPermission?.granted) requestAudioPermission();
  }, []);

  useEffect(() => {
    let mounted = true;

    const startRecording = async () => {
      if (!sessionId || !permission?.granted || !audioPermission?.granted || isRecording) return;

      try {
        setIsRecording(true);

        // Start Audio
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });
          const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
          );
          recordingRef.current = recording;
        } catch (e) {
          console.error('Failed to start audio recording', e);
        }

        // Start Video
        if (cameraRef.current) {
          // Note: CameraView recording API is slightly different
          // We use recordAsync directly
          cameraRef.current.recordAsync({
            maxDuration: 60, // Record in 1-minute chunks
            // @ts-ignore: 'mute' option is passed to native layer but missing in Expo Camera types
            mute: true,
          }).then((data) => {
            if (mounted && data?.uri && onVideoRecorded) {
              onVideoRecorded(data.uri);
            }
          }).catch(e => {
            console.error('Video recording error', e);
            // On Android, if the camera is not ready or in a bad state, it might throw.
            // We should try to recover or at least log it specifically.
            if (Platform.OS === 'android') {
              console.warn('Android specific camera error:', e.message);
            }
          });
        }

      } catch (error) {
        console.error('Failed to start capture', error);
        setIsRecording(false);
      }
    };

    const stopRecording = async () => {
      if (!isRecording) return;

      try {
        // Stop Audio
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          if (uri && onAudioRecorded) {
            onAudioRecorded(uri);
          }
          recordingRef.current = null;
        }

        // Stop Video
        if (cameraRef.current) {
          cameraRef.current.stopRecording();
        }

        setIsRecording(false);
      } catch (error) {
        console.error('Failed to stop capture', error);
      }
    };

    if (sessionId) {
      startRecording();
    } else {
      stopRecording();
    }

    return () => {
      mounted = false;
      stopRecording();
    };
  }, [sessionId, permission, audioPermission]);

  if (!permission?.granted || !sessionId) {
    return <View style={styles.hidden} />;
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="video"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 1,
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    top: -10,
    left: -10,
  },
  camera: {
    width: 100,
    height: 100,
  },
  hidden: {
    display: 'none',
  },
});
