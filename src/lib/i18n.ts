import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Navigation
      "nav.home": "Home",
      "nav.wardrobe": "Wardrobe",
      "nav.suggest": "Get Outfit",
      "nav.tryOn": "Try On",
      "nav.history": "History",
      "nav.dashboard": "Dashboard",
      "nav.signIn": "Sign In",
      "nav.signOut": "Sign Out",
      
      // Landing page
      "hero.title": "Your AI-Powered Style Assistant",
      "hero.subtitle": "Transform your wardrobe with intelligent outfit suggestions tailored to your style, weather, and occasion.",
      "hero.cta": "Start Your Style Journey",
      "hero.secondary": "Learn More",
      
      // Auth
      "auth.signIn": "Sign In",
      "auth.signUp": "Sign Up",
      "auth.email": "Email",
      "auth.password": "Password",
      "auth.confirmPassword": "Confirm Password",
      "auth.noAccount": "Don't have an account?",
      "auth.hasAccount": "Already have an account?",
      
      // Dashboard
      "dashboard.welcome": "Welcome back!",
      "dashboard.overview": "Here's your style overview",
      "dashboard.clothingItems": "Clothing Items",
      "dashboard.outfitsCreated": "Outfits Created",
      "dashboard.weatherChecks": "Weather Checks",
      "dashboard.manageWardrobe": "Manage Wardrobe",
      "dashboard.wardrobeDesc": "Upload and organize your clothing items",
      "dashboard.getOutfit": "Get Outfit Suggestion",
      "dashboard.outfitDesc": "Let AI pick the perfect outfit for today",
      
      // Wardrobe
      "wardrobe.title": "My Wardrobe",
      "wardrobe.items": "items",
      "wardrobe.uploadToAdd": "Upload to add more",
      "wardrobe.addClothing": "Add Clothing",
      "wardrobe.uploading": "Uploading...",
      "wardrobe.noItems": "No items yet",
      "wardrobe.noItemsDesc": "Upload photos of your clothes to build your digital wardrobe",
      "wardrobe.addFirst": "Add Your First Item",
      "wardrobe.all": "All",
      "wardrobe.tops": "👕 Tops",
      "wardrobe.bottoms": "👖 Bottoms",
      "wardrobe.outerwear": "🧥 Outerwear",
      "wardrobe.footwear": "👟 Footwear",
      "wardrobe.accessories": "⌚ Accessories",
      
      // Outfit Suggest
      "suggest.title": "Get Your Outfit",
      "suggest.subtitle": "Tell us where you're going and we'll pick the perfect outfit",
      "suggest.location": "Location",
      "suggest.locationPlaceholder": "Enter city name",
      "suggest.venue": "Venue Name",
      "suggest.venuePlaceholder": "e.g., Starbucks, The Ritz, Club XYZ",
      "suggest.venueHint": "AI will understand the venue type and dress code",
      "suggest.style": "Style",
      "suggest.occasion": "Occasion",
      "suggest.occasionPlaceholder": "Select an occasion",
      "suggest.getOutfit": "Get Outfit Suggestion",
      "suggest.generating": "AI is styling your outfit...",
      "suggest.needMoreItems": "Add at least 3 clothing items to your wardrobe first",
      "suggest.yourOutfit": "Your Outfit",
      "suggest.whyThisWorks": "Why this works:",
      "suggest.tryAnother": "Try Another",
      "suggest.saveFavorite": "Save Favorite",
      "suggest.saved": "Saved!",
      
      // Styles
      "style.casual": "Casual",
      "style.business": "Business",
      "style.streetwear": "Streetwear",
      "style.classic": "Classic",
      "style.sporty": "Sporty",
      "style.elegant": "Elegant",
      "style.bohemian": "Bohemian",
      "style.minimalist": "Minimalist",
      "style.vintage": "Vintage",
      "style.preppy": "Preppy",
      "style.artsy": "Artsy",
      "style.edgy": "Edgy",
      
      // Occasions
      "occasion.work": "Work / Office",
      "occasion.date": "Date Night",
      "occasion.party": "Party / Club",
      "occasion.wedding": "Wedding / Formal Event",
      "occasion.interview": "Job Interview",
      "occasion.casual": "Casual Outing",
      "occasion.brunch": "Brunch",
      "occasion.shopping": "Shopping",
      "occasion.gym": "Gym / Workout",
      "occasion.travel": "Travel",
      "occasion.meeting": "Business Meeting",
      "occasion.dinner": "Dinner",
      
      // Virtual Try-On
      "tryOn.title": "Virtual Try-On",
      "tryOn.subtitle": "See how clothes look on you with AI",
      "tryOn.uploadPhoto": "Upload Your Photo",
      "tryOn.selectClothing": "Select Clothing",
      "tryOn.generate": "Generate Try-On",
      "tryOn.generating": "Generating...",
      "tryOn.result": "Try-On Result",
      "tryOn.tryAnother": "Try Another",
      
      // History
      "history.title": "Outfit History",
      "history.subtitle": "Your past outfit suggestions and favorites",
      "history.favorites": "Favorites",
      "history.all": "All",
      "history.noOutfits": "No outfits yet",
      "history.noOutfitsDesc": "Get outfit suggestions to see them here",
      "history.delete": "Delete",
      
      // Common
      "common.loading": "Loading...",
      "common.error": "Something went wrong",
      "common.retry": "Try Again",
      "common.save": "Save",
      "common.cancel": "Cancel",
      "common.delete": "Delete",
      "common.edit": "Edit",
      "common.install": "Install App",
      "common.installDesc": "Install for a better experience",
      
      // Weather
      "weather.current": "Current Weather",
      "weather.feelsLike": "Feels like",
      "weather.humidity": "Humidity",
      
      // PWA
      "pwa.install": "Install App",
      "pwa.installPrompt": "Install StyleAI for the best experience",
    }
  },
  tr: {
    translation: {
      // Navigation
      "nav.home": "Ana Sayfa",
      "nav.wardrobe": "Gardırop",
      "nav.suggest": "Kombin Al",
      "nav.tryOn": "Sanal Deneme",
      "nav.history": "Geçmiş",
      "nav.dashboard": "Kontrol Paneli",
      "nav.signIn": "Giriş Yap",
      "nav.signOut": "Çıkış Yap",
      
      // Landing page
      "hero.title": "AI Destekli Stil Asistanınız",
      "hero.subtitle": "Gardırobunuzu stilinize, havaya ve duruma göre özelleştirilmiş akıllı kombin önerileriyle dönüştürün.",
      "hero.cta": "Stil Yolculuğunuza Başlayın",
      "hero.secondary": "Daha Fazla Bilgi",
      
      // Auth
      "auth.signIn": "Giriş Yap",
      "auth.signUp": "Kayıt Ol",
      "auth.email": "E-posta",
      "auth.password": "Şifre",
      "auth.confirmPassword": "Şifre Tekrar",
      "auth.noAccount": "Hesabınız yok mu?",
      "auth.hasAccount": "Zaten hesabınız var mı?",
      
      // Dashboard
      "dashboard.welcome": "Tekrar hoş geldiniz!",
      "dashboard.overview": "Stil özetiniz",
      "dashboard.clothingItems": "Kıyafet",
      "dashboard.outfitsCreated": "Oluşturulan Kombin",
      "dashboard.weatherChecks": "Hava Durumu",
      "dashboard.manageWardrobe": "Gardırobu Yönet",
      "dashboard.wardrobeDesc": "Kıyafetlerinizi yükleyin ve düzenleyin",
      "dashboard.getOutfit": "Kombin Önerisi Al",
      "dashboard.outfitDesc": "AI bugün için mükemmel kombini seçsin",
      
      // Wardrobe
      "wardrobe.title": "Gardırobum",
      "wardrobe.items": "parça",
      "wardrobe.uploadToAdd": "Daha fazlası için yükle",
      "wardrobe.addClothing": "Kıyafet Ekle",
      "wardrobe.uploading": "Yükleniyor...",
      "wardrobe.noItems": "Henüz parça yok",
      "wardrobe.noItemsDesc": "Dijital gardırobunuzu oluşturmak için kıyafet fotoğraflarınızı yükleyin",
      "wardrobe.addFirst": "İlk Parçanızı Ekleyin",
      "wardrobe.all": "Tümü",
      "wardrobe.tops": "👕 Üstler",
      "wardrobe.bottoms": "👖 Altlar",
      "wardrobe.outerwear": "🧥 Dış Giyim",
      "wardrobe.footwear": "👟 Ayakkabılar",
      "wardrobe.accessories": "⌚ Aksesuarlar",
      
      // Outfit Suggest
      "suggest.title": "Kombin Al",
      "suggest.subtitle": "Nereye gittiğinizi söyleyin, mükemmel kombini seçelim",
      "suggest.location": "Konum",
      "suggest.locationPlaceholder": "Şehir adı girin",
      "suggest.venue": "Mekan Adı",
      "suggest.venuePlaceholder": "örn. Starbucks, Hilton, Gece Kulübü",
      "suggest.venueHint": "AI mekan türünü ve kıyafet kurallarını anlayacak",
      "suggest.style": "Stil",
      "suggest.occasion": "Durum",
      "suggest.occasionPlaceholder": "Bir durum seçin",
      "suggest.getOutfit": "Kombin Önerisi Al",
      "suggest.generating": "AI kombininizi hazırlıyor...",
      "suggest.needMoreItems": "Önce gardırobunuza en az 3 kıyafet ekleyin",
      "suggest.yourOutfit": "Kombininiz",
      "suggest.whyThisWorks": "Neden bu kombin:",
      "suggest.tryAnother": "Başka Dene",
      "suggest.saveFavorite": "Favorilere Ekle",
      "suggest.saved": "Kaydedildi!",
      
      // Styles
      "style.casual": "Günlük",
      "style.business": "İş",
      "style.streetwear": "Sokak Modası",
      "style.classic": "Klasik",
      "style.sporty": "Sportif",
      "style.elegant": "Şık",
      "style.bohemian": "Bohem",
      "style.minimalist": "Minimalist",
      "style.vintage": "Vintage",
      "style.preppy": "Preppy",
      "style.artsy": "Sanatsal",
      "style.edgy": "Cesur",
      
      // Occasions
      "occasion.work": "İş / Ofis",
      "occasion.date": "Romantik Akşam",
      "occasion.party": "Parti / Gece Kulübü",
      "occasion.wedding": "Düğün / Resmi Etkinlik",
      "occasion.interview": "İş Görüşmesi",
      "occasion.casual": "Günlük Çıkış",
      "occasion.brunch": "Brunch",
      "occasion.shopping": "Alışveriş",
      "occasion.gym": "Spor Salonu",
      "occasion.travel": "Seyahat",
      "occasion.meeting": "İş Toplantısı",
      "occasion.dinner": "Akşam Yemeği",
      
      // Virtual Try-On
      "tryOn.title": "Sanal Deneme",
      "tryOn.subtitle": "AI ile kıyafetlerin üzerinizde nasıl göründüğünü görün",
      "tryOn.uploadPhoto": "Fotoğrafınızı Yükleyin",
      "tryOn.selectClothing": "Kıyafet Seçin",
      "tryOn.generate": "Deneme Oluştur",
      "tryOn.generating": "Oluşturuluyor...",
      "tryOn.result": "Deneme Sonucu",
      "tryOn.tryAnother": "Başka Dene",
      
      // History
      "history.title": "Kombin Geçmişi",
      "history.subtitle": "Geçmiş kombin önerileriniz ve favorileriniz",
      "history.favorites": "Favoriler",
      "history.all": "Tümü",
      "history.noOutfits": "Henüz kombin yok",
      "history.noOutfitsDesc": "Burada görmek için kombin önerisi alın",
      "history.delete": "Sil",
      
      // Common
      "common.loading": "Yükleniyor...",
      "common.error": "Bir şeyler yanlış gitti",
      "common.retry": "Tekrar Dene",
      "common.save": "Kaydet",
      "common.cancel": "İptal",
      "common.delete": "Sil",
      "common.edit": "Düzenle",
      "common.install": "Uygulamayı Yükle",
      "common.installDesc": "Daha iyi bir deneyim için yükleyin",
      
      // Weather
      "weather.current": "Mevcut Hava",
      "weather.feelsLike": "Hissedilen",
      "weather.humidity": "Nem",
      
      // PWA
      "pwa.install": "Uygulamayı Yükle",
      "pwa.installPrompt": "En iyi deneyim için StyleAI'ı yükleyin",
    }
  }
};

// Get saved language or detect from browser
const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
const browserLanguage = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
const defaultLanguage = savedLanguage || (browserLanguage === 'tr' ? 'tr' : 'en');

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
