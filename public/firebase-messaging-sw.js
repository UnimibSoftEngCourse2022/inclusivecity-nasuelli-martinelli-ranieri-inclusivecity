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