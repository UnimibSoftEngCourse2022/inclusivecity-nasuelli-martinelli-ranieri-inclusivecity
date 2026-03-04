importScripts(
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js'
);

const firebaseConfig = {
    apiKey: "AIzaSyDnMLBlVWZjdNTGIXgh9HG-qNsKH0Yzewk", // NOSONAR
    authDomain: "inclusivecity-b5698.firebaseapp.com",
    projectId: "inclusivecity-b5698",
    storageBucket: "inclusivecity-b5698.firebasestorage.app",
    messagingSenderId: "306677206049",
    appId: "1:306677206049:web:2af120e812c9c665146760"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('Ricevuto messaggio in background: ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icons/apple-icon-180.png'
    };

    globalThis.registration.showNotification(notificationTitle, notificationOptions);
});