# ECOLaver Business App

## অ্যাপ (APK) বানানো: GitHub থেকে
1. GitHub-এ নতুন **private** repo বানাও, নাম: ecolaver-app
2. Termux-এ:
```
cd ~/ecolaver-app
git init
git add .
git commit -m "ECOLaver app"
git branch -M main
git remote add origin https://github.com/তোমার-ইউজারনেম/ecolaver-app.git
git push -u origin main
```
3. GitHub-এ repo > Actions ট্যাবে "Build Android APK" নিজে চলবে (৫-১০ মিনিট)।
4. শেষ হলে repo-র ডান পাশে **Releases** > সবচেয়ে নতুন build > app-debug.apk ডাউনলোড করে ইনস্টল করো।

## নতুন আপডেট
কোড বদলে আবার `git add . && git commit -m "update" && git push` করলেই নতুন APK তৈরি হবে।
আগের অ্যাপের উপরেই ইনস্টল করো, ডেটা থাকবে। কিন্তু অ্যাপ আনইনস্টল করলে ডেটা চলে যায়, তাই আগে Settings > Download backup।

## লোকাল টেস্ট (Termux)
```
cd ~/ecolaver-app/docs
python -m http.server 8080
```
Chrome-এ localhost:8080

## অ্যাপের ভেতর থেকে আপডেট (গুরুত্বপূর্ণ)
- GitHub repo অবশ্যই **Public** হতে হবে (repo > Settings > নিচে Danger zone > Change visibility)।
- কোড বদলে `git add . && git commit -m "update" && git push` করলে GitHub নতুন APK বানায়।
- অ্যাপ খুললে নিজে চেক করে। নতুন ভার্সন থাকলে Home-এ "Update available" আসবে, "Update now" চাপলেই ডাউনলোড হয়ে ইনস্টল স্ক্রিন খুলবে।
- Settings > App update থেকেও নিজে চেক করা যায়।
