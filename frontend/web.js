import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './App';

// Register the main application component
AppRegistry.registerComponent(appName, () => App);

// Run the application for web
if (typeof window !== 'undefined') {
  AppRegistry.runApplication(appName, {
    initialProps: {},
    rootTag: document.getElementById('root') || document.getElementById('main')
  });
}