// Initialize Firebase (replace with your config)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Count unique users
async function countUser() {
  const userId = await getOrCreateUserId();
  const countRef = db.collection('stats').doc('userCount');
  
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(countRef);
    const currentCount = doc.exists ? doc.data().count : 0;
    
    if (!doc.exists || !doc.data().users.includes(userId)) {
      transaction.set(countRef, {
        count: currentCount + 1,
        users: firebase.firestore.FieldValue.arrayUnion(userId)
      }, { merge: true });
      return currentCount + 1;
    }
    return currentCount;
  });
}

// Get or create unique user ID
async function getOrCreateUserId() {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('userId', userId);
  }
  return userId;
}
