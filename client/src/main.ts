import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    // --- PREVENT ZOOMING ---

    // 1. Prevent Pinch Zoom
    document.addEventListener('touchmove', function (event: TouchEvent) {
      if ((event as any).scale !== 1) { event.preventDefault(); }
    }, { passive: false } as any);

    // 2. Prevent Double Tap Zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // 3. Prevent Ctrl+Wheel Zoom (Desktop/Trackpad)
    document.addEventListener('wheel', (e) => {
      if (e.ctrlKey) e.preventDefault();
    }, { passive: false });

  })
  .catch((err) => console.error(err));
