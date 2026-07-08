/**
 * Entry point — boots the digital twin application.
 */
import { App } from './App.js';

// Exposed for debugging / console telemetry inspection
window.__twin = new App();
