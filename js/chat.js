/* ============================================================
   GREC GROUP - Messagerie Membres (Firestore temps reel)
   ------------------------------------------------------------
   Ce module gere :
   1) La liste des membres pour demarrer une discussion
   2) La liste des conversations de l'utilisateur connecte
   3) Le flux temps reel des messages d'une conversation
   ============================================================ */

let chatCurrentUser = null;
let activeConversationId = null;
let chatUnsubscribeConversations = null;
let chatUnsubscribeMessages = null;
let chatMembersCache = [];

/* ============================================================
   Utilitaires
   ============================================================ */
function chatConversationId(uidA, uidB) {
  return [uidA, uidB].sort().join('__');
}

function chatFormatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function chatFormatRelativeTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - d.getTime()) / 1000));
  if (diffSec < 60) return 'a l\'instant';
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `il y a ${Math.floor(diffSec / 3600)} h`;
  if (diffSec < 172800) return 'hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function chatEscapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function chatTsToMillis(ts) {
  if (!ts) return 0;
  if (ts.toDate) return ts.toDate().getTime();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/* ============================================================
   Chargement des membres (annuaire lateral)
   ============================================================ */
async function chatLoadMembers() {
  const list = document.getElementById('chat-members-list');
  list.innerHTML = '<p class="chat-muted">Chargement des membres...</p>';

  const snap = await db.collection(COLLECTIONS.MEMBRES).limit(300).get();
  if (snap.empty) {
    list.innerHTML = '<p class="chat-muted">Aucun membre disponible.</p>';
    return;
  }

  const rows = [];
  snap.forEach((doc) => {
    if (doc.id === chatCurrentUser.uid) return;
    const d = doc.data() || {};
    const nom = d.nom || 'Membre GREC';
    const secteur = d.secteur || 'Membre';
    rows.push({ uid: doc.id, nom, secteur });
  });

  rows.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  chatMembersCache = rows;
  chatRenderMembers(rows);
}

function chatRenderMembers(rows) {
  const list = document.getElementById('chat-members-list');
  if (!rows.length) {
    list.innerHTML = '<p class="chat-muted">Aucun membre correspondant.</p>';
    return;
  }
  list.innerHTML = rows.map((m) => `
    <button type="button" class="chat-user-item" data-uid="${m.uid}" data-name="${chatEscapeHtml(m.nom)}">
      <span class="chat-user-name">${chatEscapeHtml(m.nom)}</span>
      <span class="chat-user-meta">${chatEscapeHtml(m.secteur)}</span>
    </button>
  `).join('');

  list.querySelectorAll('.chat-user-item').forEach((btn) => {
    btn.addEventListener('click', () => chatOpenConversationWith(btn.dataset.uid, btn.dataset.name));
  });
}

/* ============================================================
   Conversations de l'utilisateur connecte
   ============================================================ */
function chatListenConversations() {
  const list = document.getElementById('chat-conversations-list');
  const unreadTotalEl = document.getElementById('chat-unread-total');

  chatUnsubscribeConversations = db.collection(COLLECTIONS.CHATS)
    .where('participants', 'array-contains', chatCurrentUser.uid)
    .orderBy('updatedAt', 'desc')
    .onSnapshot((snap) => {
      let unreadTotal = 0;
      if (snap.empty) {
        list.innerHTML = '<p class="chat-muted">Aucune conversation pour le moment.</p>';
        unreadTotalEl.classList.add('hidden');
        return;
      }

      const html = [];
      snap.forEach((doc) => {
        const data = doc.data() || {};
        const names = data.participantNames || {};
        const otherId = (data.participants || []).find((id) => id !== chatCurrentUser.uid);
        const otherName = names[otherId] || 'Membre';
        const preview = data.lastMessageText || 'Discussion demarree';
        const updatedAt = data.updatedAt || data.lastMessageAt || null;
        const lastReadAt = data.lastReadBy && data.lastReadBy[chatCurrentUser.uid];
        const isUnread = !!(otherId && updatedAt && (chatTsToMillis(updatedAt) > chatTsToMillis(lastReadAt))) && doc.id !== activeConversationId;
        if (isUnread) unreadTotal += 1;

        html.push(`
          <button type="button" class="chat-conversation-item ${doc.id === activeConversationId ? 'active' : ''}" data-conversation-id="${doc.id}">
            <span class="chat-user-row">
              <span class="chat-user-name">${chatEscapeHtml(otherName)}</span>
              ${isUnread ? '<span class="chat-unread-dot" title="Non lu"></span>' : ''}
            </span>
            <span class="chat-user-meta">${chatEscapeHtml(preview)}</span>
            <span class="chat-user-meta">${chatEscapeHtml(chatFormatRelativeTime(updatedAt))}</span>
          </button>
        `);
      });

      list.innerHTML = html.join('');
      list.querySelectorAll('.chat-conversation-item').forEach((btn) => {
        btn.addEventListener('click', () => chatOpenConversation(btn.dataset.conversationId));
      });
      if (unreadTotal > 0) {
        unreadTotalEl.textContent = unreadTotal > 99 ? '99+' : String(unreadTotal);
        unreadTotalEl.classList.remove('hidden');
      } else {
        unreadTotalEl.classList.add('hidden');
      }
    }, (err) => {
      list.innerHTML = `<p class="chat-muted">Erreur chargement conversations: ${chatEscapeHtml(err.message)}</p>`;
    });
}

/* ============================================================
   Creation / ouverture d'une conversation
   ============================================================ */
async function chatOpenConversationWith(targetUid, targetName) {
  const id = chatConversationId(chatCurrentUser.uid, targetUid);
  const ref = db.collection(COLLECTIONS.CHATS).doc(id);
  const currentName = document.getElementById('chat-current-user-name').textContent || chatCurrentUser.email;

  await ref.set({
    participants: [chatCurrentUser.uid, targetUid],
    participantNames: {
      [chatCurrentUser.uid]: currentName,
      [targetUid]: targetName || 'Membre'
    },
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastReadBy: {
      [chatCurrentUser.uid]: firebase.firestore.FieldValue.serverTimestamp()
    },
    lastMessageText: 'Conversation créée'
  }, { merge: true });

  chatOpenConversation(id);
}

function chatOpenConversation(conversationId) {
  activeConversationId = conversationId;
  document.getElementById('chat-send-btn').disabled = false;
  document.getElementById('chat-message-input').disabled = false;

  if (chatUnsubscribeMessages) chatUnsubscribeMessages();

  const messagesEl = document.getElementById('chat-messages');
  messagesEl.innerHTML = '<p class="chat-muted">Chargement des messages...</p>';

  chatUnsubscribeMessages = db.collection(COLLECTIONS.CHATS)
    .doc(conversationId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot((snap) => {
      if (snap.empty) {
        messagesEl.innerHTML = '<p class="chat-muted">Aucun message pour le moment.</p>';
        return;
      }

      messagesEl.innerHTML = '';
      snap.forEach((doc) => {
        const msg = doc.data() || {};
        const mine = msg.senderId === chatCurrentUser.uid;
        const node = document.createElement('div');
        node.className = `chat-bubble ${mine ? 'mine' : 'other'}`;
        node.innerHTML = `
          <div class="chat-bubble-text">${chatEscapeHtml(msg.text || '')}</div>
          <div class="chat-bubble-time">${chatFormatTime(msg.createdAt)}</div>
        `;
        messagesEl.appendChild(node);
      });

      messagesEl.scrollTop = messagesEl.scrollHeight;

      db.collection(COLLECTIONS.CHATS).doc(conversationId).set({
        lastReadBy: {
          [chatCurrentUser.uid]: firebase.firestore.FieldValue.serverTimestamp()
        }
      }, { merge: true }).catch(() => {});
    }, (err) => {
      messagesEl.innerHTML = `<p class="chat-muted">Erreur: ${chatEscapeHtml(err.message)}</p>`;
    });

  document.querySelectorAll('.chat-conversation-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.conversationId === conversationId);
  });
}

/* ============================================================
   Envoi de message
   ============================================================ */
async function chatSendMessage(event) {
  event.preventDefault();

  if (!activeConversationId) {
    showToast('Choisis un membre ou une conversation.', 'info');
    return;
  }

  const input = document.getElementById('chat-message-input');
  const text = (input.value || '').trim();
  if (!text) return;

  const msgRef = db.collection(COLLECTIONS.CHATS)
    .doc(activeConversationId)
    .collection('messages')
    .doc();

  await msgRef.set({
    senderId: chatCurrentUser.uid,
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await db.collection(COLLECTIONS.CHATS).doc(activeConversationId).set({
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastMessageText: text
  }, { merge: true });

  input.value = '';
}

/* ============================================================
   Initialisation ecran messagerie
   ============================================================ */
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }

  chatCurrentUser = user;

  const profile = await db.collection(COLLECTIONS.MEMBRES).doc(user.uid).get();
  const name = profile.exists ? (profile.data().nom || user.email) : user.email;
  document.getElementById('chat-current-user-name').textContent = name;

  await chatLoadMembers();
  const searchInput = document.getElementById('chat-members-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = (searchInput.value || '').trim().toLowerCase();
      const filtered = !q
        ? chatMembersCache
        : chatMembersCache.filter((m) => (m.nom || '').toLowerCase().includes(q) || (m.secteur || '').toLowerCase().includes(q));
      chatRenderMembers(filtered);
    });
  }
  chatListenConversations();
});

window.addEventListener('beforeunload', () => {
  if (chatUnsubscribeConversations) chatUnsubscribeConversations();
  if (chatUnsubscribeMessages) chatUnsubscribeMessages();
});
