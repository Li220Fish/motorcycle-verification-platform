/**
 * Dev/QA-only seed script for cross-account Message Center / Discussion
 * Center demo data — a Buyer<->Seller "交易中" thread (incl. a verification
 * report share), a Buyer<->Dealer "買家詢問" thread, and 5 discussion posts
 * with likes/comments/follows spread across the 3 test accounts.
 *
 * Uses the Firebase client SDK only, one Auth instance per persona (so
 * every write really is made "as" that user, satisfying the Firestore rules
 * exactly like the real app would), no Admin SDK / service account.
 *
 * Same production guard as scripts/seed-test-users.mjs.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/seed-demo-data.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const result = {}
  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return result
}

function guardEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[seed-demo-data] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[seed-demo-data] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
  }
}

const PASSWORD = 'MotoVerify123!'

async function personaFor(firebaseConfig, appName, email) {
  const app = initializeApp(firebaseConfig, appName)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const credential = await signInWithEmailAndPassword(auth, email, PASSWORD)
  return { uid: credential.user.uid, displayName: credential.user.displayName ?? email, db }
}

// --- Chat helpers (mirrors src/services/chat/*) ---

function messagesCollection(db, conversationId) {
  return collection(db, 'conversations', conversationId, 'messages')
}

async function findOrCreateConversation(sender, other, context, tag) {
  const snap = await getDocs(
    query(collection(sender.db, 'conversations'), where('memberIds', 'array-contains', sender.uid)),
  )
  const existing = snap.docs.find((d) => {
    const data = d.data()
    const sameMembers = data.memberIds.length === 2 && data.memberIds.includes(other.uid)
    const sameListing = context?.vehicleId
      ? data.context?.vehicleId === context.vehicleId
      : !data.context?.vehicleId
    return sameMembers && sameListing
  })
  if (existing) return existing.id

  const docRef = await addDoc(collection(sender.db, 'conversations'), {
    memberIds: [sender.uid, other.uid],
    memberSnapshots: {
      [sender.uid]: { displayName: sender.displayName },
      [other.uid]: { displayName: other.displayName },
    },
    context: context ?? null,
    tag,
    lastMessage: null,
    lastMessageAt: serverTimestamp(),
    unreadCounts: { [sender.uid]: 0, [other.uid]: 0 },
    lastReadAtBy: {},
    mutedBy: [],
    archivedBy: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

async function sendMessage(sender, conversationId, otherUid, fields, previewText) {
  const batch = writeBatch(sender.db)
  const messageRef = doc(messagesCollection(sender.db, conversationId))
  batch.set(messageRef, {
    conversationId,
    senderId: sender.uid,
    createdAt: serverTimestamp(),
    ...fields,
  })
  batch.update(doc(sender.db, 'conversations', conversationId), {
    lastMessage: {
      type: fields.type,
      text: previewText,
      senderId: sender.uid,
      createdAt: serverTimestamp(),
    },
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    [`unreadCounts.${otherUid}`]: increment(1),
  })
  await batch.commit()
}

// --- Discussion helpers (mirrors src/services/discussion/*) ---

async function createPost(author, input) {
  const docRef = await addDoc(collection(author.db, 'discussionPosts'), {
    authorId: author.uid,
    authorSnapshot: { displayName: author.displayName },
    title: input.title,
    body: input.body,
    category: input.category,
    media: [],
    likeCount: 0,
    commentCount: 0,
    featured: input.featured ?? false,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

async function likePost(liker, postId) {
  const postRef = doc(liker.db, 'discussionPosts', postId)
  const likeRef = doc(liker.db, 'discussionPosts', postId, 'likes', liker.uid)
  await runTransaction(liker.db, async (tx) => {
    const likeSnap = await tx.get(likeRef)
    if (likeSnap.exists()) return
    tx.set(likeRef, { uid: liker.uid, createdAt: serverTimestamp() })
    tx.update(postRef, { likeCount: increment(1) })
  })
}

async function commentOnPost(author, postId, text) {
  const batch = writeBatch(author.db)
  const commentRef = doc(collection(author.db, 'discussionPosts', postId, 'comments'))
  batch.set(commentRef, {
    postId,
    authorId: author.uid,
    authorSnapshot: { displayName: author.displayName },
    text,
    status: 'active',
    parentCommentId: null,
    createdAt: serverTimestamp(),
  })
  batch.update(doc(author.db, 'discussionPosts', postId), { commentCount: increment(1) })
  await batch.commit()
}

async function follow(follower, targetUid) {
  await setDoc(doc(follower.db, 'users', follower.uid, 'following', targetUid), {
    targetUid,
    followedAt: serverTimestamp(),
  })
}

async function main() {
  guardEnvironment()

  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'))
  const envDefault = loadEnvFile(path.join(rootDir, '.env'))
  const env = { ...envDefault, ...envLocal, ...process.env }
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('[seed-demo-data] Missing Firebase config — check .env / .env.local.')
    process.exit(1)
  }

  console.log(`[seed-demo-data] Seeding into Firebase project: ${firebaseConfig.projectId}`)

  const buyer = await personaFor(firebaseConfig, 'buyerApp', 'buyer@motoverify.test')
  buyer.displayName = '測試買家'
  const seller = await personaFor(firebaseConfig, 'sellerApp', 'seller@motoverify.test')
  seller.displayName = '測試賣家'
  const dealer = await personaFor(firebaseConfig, 'dealerApp', 'dealer@motoverify.test')
  dealer.displayName = 'MotoVerify 車商'

  // 1. A demo vehicle + a completed seller verification, owned by the
  //    seller test account, so the shared "verification report" message has
  //    something real to point at. Idempotent — delete any previous run's
  //    demo vehicle (same owner+model) first, same pattern as
  //    scripts/seed-mock-vehicles.mjs, so re-running doesn't accumulate
  //    duplicates.
  const existingDemoVehicles = await getDocs(
    query(collection(seller.db, 'vehicles'), where('currentOwnerId', '==', seller.uid)),
  )
  for (const d of existingDemoVehicles.docs) {
    if (d.data().model !== '勁戰六代 (Demo)') continue
    const oldVerifications = await getDocs(
      query(collection(seller.db, 'verifications'), where('vehicleId', '==', d.id)),
    )
    for (const v of oldVerifications.docs) await deleteDoc(v.ref)
    await deleteDoc(d.ref)
  }

  const vehicleRef = await addDoc(collection(seller.db, 'vehicles'), {
    brand: 'YAMAHA',
    model: '勁戰六代 (Demo)',
    manufactureYear: 2023,
    mileage: 3200,
    licensePlate: 'DEMO-001',
    photos: [],
    currentOwnerId: seller.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  const verificationRef = await addDoc(collection(seller.db, 'verifications'), {
    vehicleId: vehicleRef.id,
    userId: seller.uid,
    type: 'seller',
    status: 'completed',
    mileage: 3200,
    isPublic: false,
    protocolVersion: 1,
    schemaVersion: 1,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(seller.db, 'verifications', verificationRef.id), {
    status: 'completed',
    completedAt: serverTimestamp(),
  })
  // Made public before sharing it in chat below — the buyer opening this
  // report from ChatBubble.vue's rich-card preview reads verifications/{id}
  // directly, which is owner-only until isPublic flips true (mirrors
  // listingService.publish()'s real flow, just done directly here since
  // there's no listing behind this demo verification).
  await updateDoc(doc(seller.db, 'verifications', verificationRef.id), { isPublic: true })
  console.log(`[seed-demo-data] demo vehicle=${vehicleRef.id} verification=${verificationRef.id}`)

  // 2. Buyer <-> Seller "交易中" conversation about that vehicle.
  const dealConvoId = await findOrCreateConversation(
    buyer,
    seller,
    { vehicleId: vehicleRef.id },
    '交易中',
  )
  await sendMessage(
    buyer,
    dealConvoId,
    seller.uid,
    { type: 'text', text: '你好，請問這台車還在嗎？' },
    '你好，請問這台車還在嗎？',
  )
  await sendMessage(
    seller,
    dealConvoId,
    buyer.uid,
    { type: 'text', text: '在的，歡迎預約看車！' },
    '在的，歡迎預約看車！',
  )
  await sendMessage(
    seller,
    dealConvoId,
    buyer.uid,
    { type: 'verification_report', verificationId: verificationRef.id },
    '[驗證報告]',
  )
  await sendMessage(
    buyer,
    dealConvoId,
    seller.uid,
    { type: 'text', text: '報告我看過了，狀況不錯，我們約看車時間吧！' },
    '報告我看過了，狀況不錯，我們約看車時間吧！',
  )
  console.log(`[seed-demo-data] conversation(交易中)=${dealConvoId}`)

  // 3. Buyer <-> Dealer "買家詢問" conversation.
  const inquiryConvoId = await findOrCreateConversation(buyer, dealer, undefined, '買家詢問')
  await sendMessage(
    buyer,
    inquiryConvoId,
    dealer.uid,
    { type: 'text', text: '請問門市有其他勁戰六代的車款嗎？' },
    '請問門市有其他勁戰六代的車款嗎？',
  )
  await sendMessage(
    dealer,
    inquiryConvoId,
    buyer.uid,
    { type: 'text', text: '有的，目前有兩台現車，要幫您安排看車嗎？' },
    '有的，目前有兩台現車，要幫您安排看車嗎？',
  )
  await sendMessage(
    buyer,
    inquiryConvoId,
    dealer.uid,
    { type: 'text', text: '好的，麻煩了，我這週六有空' },
    '好的，麻煩了，我這週六有空',
  )
  console.log(`[seed-demo-data] conversation(買家詢問)=${inquiryConvoId}`)

  // 4. Discussion posts spread across the 3 accounts, with likes/comments/follows.
  const posts = []
  posts.push({
    author: seller,
    id: await createPost(seller, {
      title: '賣車前详细验车心得分享',
      body: '最近要出售愛車，特地用 MotoVerify 完整跑過一次驗車流程，把電系、外觀、里程都拍照存證，交易時買家也比較放心。分享給大家參考！',
      category: '賣車討論',
      featured: true,
    }),
  })
  posts.push({
    author: buyer,
    id: await createPost(buyer, {
      title: '第一次買中古車，驗車該注意什麼？',
      body: '爬了很多文章還是有點不知道從哪裡開始，想請教大家實際看車驗車時最容易被忽略的地方是什麼？',
      category: '購車討論',
    }),
  })
  posts.push({
    author: dealer,
    id: await createPost(dealer, {
      title: '門市優惠：勁戰六代验车保证',
      body: '本店現車勁戰六代皆提供 MotoVerify 完整驗車報告，歡迎預約賞車，現場都可以隨時調閱驗車紀錄。',
      category: '車款交流',
    }),
  })
  posts.push({
    author: seller,
    id: await createPost(seller, {
      title: '電系檢測這段真的重要',
      body: '之前完全沒注意電系，這次用快速電檢流程才發現電瓶已經有點衰退，提早換掉省了不少麻煩。',
      category: '驗車討論',
    }),
  })
  posts.push({
    author: buyer,
    id: await createPost(buyer, {
      title: '騎乘生活分享：假日環島紀錄',
      body: '趁著連假跑了一趟環島，沿途拍了不少照片，也順便測試新車的續航表現，整體騎起來很穩定！',
      category: '騎乘生活',
    }),
  })

  await likePost(dealer, posts[0].id)
  await likePost(buyer, posts[0].id)
  await likePost(seller, posts[1].id)
  await likePost(dealer, posts[1].id)
  await likePost(buyer, posts[2].id)
  await likePost(buyer, posts[3].id)
  await likePost(dealer, posts[4].id)

  await commentOnPost(dealer, posts[1].id, '建議一定要檢查電系跟外觀鈑件接縫，這兩項最容易被忽略。')
  await commentOnPost(seller, posts[2].id, '請問假日看車方便嗎？我這邊也在考慮換車。')
  await commentOnPost(buyer, posts[0].id, '推！有驗車報告買起來真的安心很多。')

  await follow(buyer, seller.uid)
  await follow(buyer, dealer.uid)
  await follow(dealer, seller.uid)

  console.log('[seed-demo-data] posts:')
  console.table(posts.map((p) => ({ id: p.id, author: p.author.displayName })))

  console.log('[seed-demo-data] Done.')
  process.exit(0)
}

main().catch((error) => {
  console.error('[seed-demo-data] Failed:', error)
  process.exit(1)
})
