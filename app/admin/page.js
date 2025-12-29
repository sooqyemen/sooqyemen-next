rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // السماح للجميع بالقراءة، ولكن الكتابة للمدير فقط
    match /categories/{document=**} {
      allow read: if true;
      allow write: if request.auth.token.email == "mansouralbarout@gmail.com";
    }
    
    // الإعلانات: القراءة للكل، الإنشاء للمسجلين، التعديل/الحذف للمالك أو المدير
    match /listings/{listingId} {
    	// نسمح بالقراءة إذا كان الإعلان نشطاً أو إذا كان الطالب هو المالك أو المدير
      allow read: if resource.data.active != false || request.auth.uid == resource.data.userId || request.auth.token.email == "mansouralbarout@gmail.com";
      
      allow create: if request.auth != null;
      
      // التعديل والحذف: لصاحب الإعلان أو للمدير
      allow update, delete: if request.auth.uid == resource.data.userId || request.auth.token.email == "mansouralbarout@gmail.com";
    }
    
    // ... باقي القواعد
  }
}
