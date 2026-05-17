# Firebase Setup Guide for Campus Map App

## Step 1: Firebase Console Setup (Web)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **rmu-campus-navigation-app**
3. Go to **Firestore Database**
4. Create a collection called **locations** (if not exists)

### Location Document Structure
Each location document should have:
```json
{
  "name": "Science Building",
  "building": "Building A",
  "floor": "3",
  "description": "Physics and Chemistry labs",
  "category": "lab",
  "latitude": 40.1234,
  "longitude": -74.5678,
  "imageUrls": [
    "https://firebasestorage.googleapis.com/v0/b/...",
    "https://firebasestorage.googleapis.com/v0/b/..."
  ],
  "createdAt": "2024-02-23T10:30:00Z"
}
```

---

## Step 2: Set Up Firebase Storage Rules

1. Go to **Firebase Console** → **Storage**
2. Click **Rules** tab
3. Replace with these rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read all images
    match /locations/{allPaths=**} {
      allow read: if request.auth != null;
      // Only admins can upload/delete location images
      allow write: if request.auth.token.customClaims.role == 'admin'
                   && request.resource.size < 5242880; // 5MB max
    }
  }
}
```

4. Click **Publish**

---

## Step 3: Set Up Firestore Rules

1. Go to **Firestore Database** → **Rules** tab
2. Replace with (example):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Locations: everyone can read, admin can write
    match /locations/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.customClaims.role == 'admin';
    }
  }
}
```

---

## Step 4: Update Your Code

### Already Done ✓
- ✓ Firebase Storage is already initialized in `src/config/firebase.js`
- ✓ `AddLocationsScreen.js` already has latitude/longitude fields
- ✓ Image picker is already implemented

### TODO: Upload Images to Firebase

See the updated service files for image upload functionality.

---

## Step 5: How to Use

1. **Add a Location**:
   - Go to Admin Dashboard → **Manage Locations**
   - Click the **+** button
   - Fill in: Name, Building, Floor, Description, Category
   - **Enter Latitude** (e.g., 40.1234)
   - **Enter Longitude** (e.g., -74.5678)
   - Click "+ Add Photos" to pick images from gallery or camera
   - Images will be uploaded to Firebase Storage automatically
   - Click **Save** to save to Firestore

2. **View Locations**:
   - Students/Guests can see location details with photos
   - Location search will filter by name, building, description

---

## Getting Latitude & Longitude

### Option 1: Use Google Maps
- Go to [Google Maps](https://maps.google.com)
- Right-click on the location
- Copy the latitude, longitude from the popup

### Option 2: Use the Map in Your App
- Navigate to location on the in-app map
- Tap and hold to get coordinates (feature coming soon)

### Option 3: Use GPS
- Use your phone's GPS or a GPS app
- Note down the exact coordinates

**Example:**
- Science Building: **40.1234, -74.5678**
- Library: **40.1250, -74.5690**

---

## Firestore Document Example

```javascript
{
  id: "loc_001",
  name: "Science Building Physics Lab",
  building: "Building A",
  floor: "3",
  description: "Physics experiments and demonstrations",
  category: "lab",
  latitude: 40.1234,
  longitude: -74.5678,
  imageUrls: [
    "https://firebasestorage.googleapis.com/v0/b/rmu-campus-navigation-app.firebasestorage.app/o/locations%2Floc_001%2F0.jpg?alt=media&token=abc123",
    "https://firebasestorage.googleapis.com/v0/b/rmu-campus-navigation-app.firebasestorage.app/o/locations%2Floc_001%2F1.jpg?alt=media&token=def456"
  ],
  createdAt: "2024-02-23T10:30:00Z"
}
```

---

## Testing Your Setup

1. **Add a location with 1 photo**
2. Check Firebase Console:
   - ✓ New document in `locations` collection
   - ✓ Image in `locations/{locationId}/` folder in Storage
   - ✓ `imageUrls` array with Firebase URLs
3. **View the location** - photo should load
4. **Edit the location** - can change coordinates and add more photos
5. **Delete the location** - removes Firestore doc and all photos from Storage

---

## Common Issues & Fixes

### Images not uploading?
- ✓ Check Firebase Storage Rules (allow write for admins)
- ✓ Check Firestore Rules (allow write for admins)
- ✓ Ensure `role: 'admin'` is set in user custom claims

### Can't see coordinates in UI?
- ✓ Coordinates are stored but might not display
- ✓ Check the "Manage Locations" list for latitude/longitude in details

### Photos not showing?
- ✓ Check Firebase Storage Rules (allow read for authenticated users)
- ✓ Try refreshing the app
- ✓ Check browser console for 403/404 errors

### Size limits?
- Current limit: 5MB per image
- Recommended: Compress images before upload (500KB-2MB optimal)

