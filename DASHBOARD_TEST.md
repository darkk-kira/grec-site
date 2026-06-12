# Test Plan - Admin Dashboard CRUD Operations

## 🔐 Access & Authentication
- [ ] Login with admin email (admin@grec.com)
- [ ] Dashboard loads successfully
- [ ] "Admin validé" badge appears
- [ ] All sections render without JS errors

## 📰 Articles Section
- [ ] Create article with image upload (test Cloudinary)
- [ ] Upload triggers progress feedback
- [ ] Article appears in list with thumbnail
- [ ] Edit article (modify title, content, image)
- [ ] Mark as "Publié" / "Une" toggles work
- [ ] Delete article with confirmation
- [ ] Deletion removes from list immediately
- [ ] Action logged in audit trail

## 📅 Events Section  
- [ ] Create event with date picker
- [ ] Date format saves correctly to Firestore
- [ ] Event image uploads via Cloudinary
- [ ] Edit event (change date, location, description)
- [ ] Delete event with confirmation
- [ ] Action logged in audit trail

## 🖼️ Gallery Section
- [ ] Create gallery photo with category select
- [ ] Photo uploads to "galerie/" folder in Cloudinary
- [ ] Category persists (reunions, formations, etc.)
- [ ] Edit photo details and category
- [ ] Delete photo with confirmation
- [ ] Action logged in audit trail

## 👥 Partners Section
- [ ] Create partner with logo upload
- [ ] Logo uploads to "partenaires/logos/" path
- [ ] Partner URL optional field works
- [ ] "Publie" checkbox toggles visibility
- [ ] Edit partner (name, url, logo)
- [ ] Delete partner with confirmation
- [ ] Action logged in audit trail

## 👤 Members Section
- [ ] Search members by name/sector
- [ ] Filter by status (Actif / Suspendu)
- [ ] "Suspendre" button toggles member status
- [ ] "Afficher/Masquer" toggles profile visibility
- [ ] **NEW** "Supprimer" button present
- [ ] Delete member with strong confirmation
- [ ] Deleted member removed from list
- [ ] Member action logged in audit trail

## 💬 Messages
- [ ] Contact messages display with sender info
- [ ] Newsletter subscriptions show email
- [ ] Delete contact with confirmation
- [ ] Delete newsletter entry
- [ ] Actions logged in audit trail

## 📊 Audit Trail (Journal d'audit)
- [ ] Section loads 100 last actions
- [ ] Actions display: timestamp, admin, action type, document ID
- [ ] **Timestamps** show correctly (French format)
- [ ] Can see:
  - create-article, update-article, delete-article
  - create-event, update-event, delete-event
  - create-gallery, update-gallery, delete-gallery
  - create-partner, update-partner, delete-partner
  - delete-member
  - delete-contact, delete-newsletter
  - toggle-member-public
- [ ] Newest actions appear first (orderBy desc)
- [ ] Audit log count updates correctly

## ⚠️ Error Handling
- [ ] Upload with invalid file shows error toast
- [ ] Required fields validation works (partner name)
- [ ] Network error caught and displayed
- [ ] Form reset after successful save
- [ ] Confirmation dialogs prevent accidental deletion

## 🔄 State & Refresh
- [ ] "Rafraîchir maintenant" button reloads all data
- [ ] Stats update after add/delete/update
- [ ] List counts refresh immediately
- [ ] Pending items count accurate

## 🖼️ Cloudinary Integration
- [ ] UPLOAD_PRESET="grec-upload" is active
- [ ] Uploads complete in < 5 seconds
- [ ] Images display after upload
- [ ] Folder organization works:
  - actualites/
  - evenements/
  - galerie/
  - partenaires/logos/

## ✅ Final Verification
- [ ] No console errors
- [ ] No 404 requests
- [ ] All Firestore calls succeed
- [ ] Toast notifications clear and readable
- [ ] Responsive on mobile/tablet
- [ ] All delete operations reversible only via manual Firestore edit

---

## Cloudinary Account Verification

**Required**: Unsigned upload preset "grec-upload" configured in Cloudinary:
1. Go to cloudinary.com dashboard
2. Settings → Upload
3. Check "Add unsigned upload preset"
4. Name: "grec-upload"
5. Unsigned: Yes
6. Save

If preset is NOT active, uploads will fail with 401/403 error.

---

## Known Limitations

- Member deletion is permanent (no soft delete)
- Audit log shows last 100 actions only
- No cascade delete for related data (member chats, contributions)
- Timestamps in ACTION_LOG include both server timestamp and ISO string for compatibility
