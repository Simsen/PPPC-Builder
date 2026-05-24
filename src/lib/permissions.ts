import type { PppcPermission } from './types';

export const PPPC_PERMISSIONS: PppcPermission[] = [
  {
    id: 'accessibility',
    name: 'Accessibility',
    description: 'Control your computer using accessibility features',
    tccService: 'Accessibility',
    canForceAllow: true,
  },
  {
    id: 'fullDiskAccess',
    name: 'Full Disk Access',
    description: 'Access all files on the system, including system-protected areas',
    tccService: 'SystemPolicyAllFiles',
    canForceAllow: true,
  },
  {
    id: 'screenRecording',
    name: 'Screen Recording',
    description: 'Record the contents of the screen',
    tccService: 'ScreenCapture',
    canForceAllow: false,
    tooltip:
      'Apple requires user consent for Screen Recording. MDM can only allow standard users to enable this permission.',
  },
  {
    id: 'microphone',
    name: 'Microphone',
    description: 'Access the microphone',
    tccService: 'Microphone',
    canForceAllow: false,
    tooltip:
      'Apple requires user consent for Microphone access. MDM can only allow standard users to enable this permission.',
  },
  {
    id: 'camera',
    name: 'Camera',
    description: 'Access the camera',
    tccService: 'Camera',
    canForceAllow: false,
    tooltip:
      'Apple requires user consent for Camera access. MDM can only allow standard users to enable this permission.',
  },
  {
    id: 'automation',
    name: 'Automation (Apple Events)',
    description: 'Control other apps via Apple Events/AppleScript',
    tccService: 'AppleEvents',
    canForceAllow: true,
  },
  {
    id: 'contacts',
    name: 'Contacts',
    description: 'Access your contacts',
    tccService: 'AddressBook',
    canForceAllow: true,
  },
  {
    id: 'calendars',
    name: 'Calendars',
    description: 'Access your calendars',
    tccService: 'Calendar',
    canForceAllow: true,
  },
  {
    id: 'photos',
    name: 'Photos',
    description: 'Access your photo library',
    tccService: 'Photos',
    canForceAllow: true,
  },
  {
    id: 'bluetooth',
    name: 'Bluetooth',
    description: 'Use Bluetooth devices',
    tccService: 'BluetoothAlways',
    canForceAllow: true,
  },
  {
    id: 'removableVolumes',
    name: 'Removable Volumes',
    description: 'Access files on removable volumes',
    tccService: 'SystemPolicyRemovableVolumes',
    canForceAllow: true,
  },
];
