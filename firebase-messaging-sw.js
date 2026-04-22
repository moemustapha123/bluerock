// Firebase Cloud Messaging Service Worker
// This file must be served from the root of your domain (same folder as the HTML file)

importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDfQWs3A5DI4i6IKo2llU9pH-zQUF6dbRY",
  authDomain: "bluerock-property-management.firebaseapp.com",
  databaseURL: "https://bluerock-property-management-default-rtdb.firebaseio.com",
  projectId: "bluerock-property-management",
  storageBucket: "bluerock-property-management.firebasestorage.app",
  messagingSenderId: "581930721809",
  appId: "1:581930721809:web:0c02d4d7e383bc5b5e07b0",
});

const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Bluerock Property Management", {
    body: body || "",
    icon: "/icon.png",
    badge: "/icon.png",
    data: payload.data,
  });
});

// Click: open the app to My Jobs tab
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      const appUrl = "https://bluerock-property-management.web.app#myjobs";
      for (const client of clientList) {
        if (client.url.includes("bluerock") && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(appUrl);
    })
  );
});
