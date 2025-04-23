# Welcome to the Medication Reminder App 
This is a mobile app built using **React Native** and **Expo** to help users manage their daily medication. Users can log medicines, get reminder notifications, and track their medication history.
## Technical Stack

- **Frontend**: React Native, Expo
- **Backend**: Appwrite
- **Authentication**: Phone-based OTP
- **OCR**: MLKit and OCR.space and Expo imgePicker library
- **Notifications**: Appwrite
- **Database**: Appwrite Database

## How to Run the App

**Clone the repo**

**Install dependencies** 

   ```bash
   npm install
   ```
**Start the app**
```bash
   npx expo start
   ```
It will start the expo 

Press s │ switch to Expo Go (for testing the app on mobile device)

**Scan the QR code** using the **Expo Go app** on your Android phone OR using camera on IOS
Start using the APP

## 📱 Build APK (Optional)

If you want to generate an APK file:

1. Install EAS CLI:

   ```bash
   npm install -g eas-cli
   ```
   
2. Configure the project:
```bash
   eas build:configure
   ```
3. Build the APK:
```bash
   eas build -p android --profile preview
   ```
```bash
   eas build -p ios --profile preview
   ```
> You will get a download link for the APK from the Expo build service.

## Flow Chart Diagram
![Screenshot](/assets/images/Diagram.png)


## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

