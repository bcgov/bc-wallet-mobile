// Alert interaction types (display, action ie: 'OK' button pressed)
export enum AlertInteractionEvent {
  ALERT_DISPLAY = 'alert_display',
  ALERT_ACTION = 'alert_action',
}

/**
 * Alert events
 *
 * TODO (MD): combine all Android and iOS alert events from `ias-android` and `ias-ios` current code ie: AlertKey.java...
 * 						and add all mapped values from `bcsc_alerts.json` to translation files
 */
export enum AlertEvent {
  ADD_CARD_CAMERA_BROKEN = 'add_card_camera_broken',
  // ... other alert events go here
}
