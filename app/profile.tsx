import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { clearAllergies } from '../services/allergyStorage';

function BottomNavItem({
  icon,
  label,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
}) {
  return (
    <View style={styles.bottomNavItem}>
      <Ionicons
        name={icon}
        size={20}
        color={active ? '#2563eb' : '#9ca3af'}
      />
      <Text style={[styles.bottomNavText, active && styles.bottomNavTextActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, loading, continueAsGuest, signOutUser } = useAuth();

  const handleGuestPress = async () => {
    try {
      await continueAsGuest();
    } catch (error) {
      console.error(error);
      Alert.alert('Guest sign-in failed', 'Please try again.');
    }
  };

  const handleExitGuestMode = async () => {
    try {
      await clearAllergies();
      await signOutUser();
    } catch (error) {
      console.error(error);
      Alert.alert('Exit guest mode failed', 'Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error(error);
      Alert.alert('Sign out failed', 'Please try again.');
    }
  };

  const handlePlaceholder = (label: string) => {
    Alert.alert(
      `${label} not wired yet`,
      'For now, Continue as Guest is the real working auth flow.'
    );
  };

  const renderSettingsSection = () => (
    <>
      <Text style={styles.sectionLabel}>HEALTH PROFILE</Text>

      <Pressable
        style={styles.settingRow}
        onPress={() => router.push('/allergy-profile')}
      >
        <View style={styles.settingLeft}>
          <View style={styles.settingIconCircle}>
            <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
          </View>
          <View>
            <Text style={styles.settingTitle}>Allergy Profile</Text>
            <Text style={styles.settingSubtitle}>
              Manage your medication allergies
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
      </Pressable>

      <Text style={styles.sectionLabel}>APP SETTINGS</Text>

      <View style={styles.settingsGroup}>
        <Pressable
          style={styles.settingRow}
          onPress={() => Alert.alert('Not built yet')}
        >
          <View style={styles.settingLeft}>
            <View style={styles.settingIconCircleBlue}>
              <Ionicons name="notifications-outline" size={16} color="#2563eb" />
            </View>
            <View>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Text style={styles.settingSubtitle}>
                Manage notification preferences
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </Pressable>

        <Pressable
          style={styles.settingRow}
          onPress={() => Alert.alert('Not built yet')}
        >
          <View style={styles.settingLeft}>
            <View style={styles.settingIconCircleGreen}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#16a34a" />
            </View>
            <View>
              <Text style={styles.settingTitle}>Privacy & Data</Text>
              <Text style={styles.settingSubtitle}>
                Control your data and privacy
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </Pressable>

        <Pressable
          style={styles.settingRow}
          onPress={() => Alert.alert('Not built yet')}
        >
          <View style={styles.settingLeft}>
            <View style={styles.settingIconCircleGray}>
              <Ionicons name="settings-outline" size={16} color="#6b7280" />
            </View>
            <View>
              <Text style={styles.settingTitle}>General Settings</Text>
              <Text style={styles.settingSubtitle}>
                App preferences and customization
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </Pressable>
      </View>
    </>
  );

  const renderAuthSection = () => {
    if (loading) {
      return (
        <View style={styles.authCard}>
          <Text style={styles.authTitle}>Loading...</Text>
        </View>
      );
    }

    if (!user) {
      return (
        <>
          <View style={styles.signInCard}>
            <View style={styles.welcomeIcon}>
              <Text style={styles.welcomeIconText}>💊</Text>
            </View>

            <Text style={styles.welcomeTitle}>Welcome to MedTrack</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to save your preferences
            </Text>

            <Pressable
              style={styles.providerButton}
              onPress={() => handlePlaceholder('Google sign-in')}
            >
              <Text style={styles.providerButtonText}>Continue with Gmail</Text>
            </Pressable>

            <Pressable
              style={styles.appleButton}
              onPress={() => handlePlaceholder('Apple sign-in')}
            >
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </Pressable>

            <Pressable
              style={styles.providerButton}
              onPress={() => handlePlaceholder('Phone sign-in')}
            >
              <Text style={styles.providerButtonText}>Continue with Phone Number</Text>
            </Pressable>

            <Pressable onPress={handleGuestPress} style={styles.guestLinkWrap}>
              <Text style={styles.guestLink}>Continue as Guest</Text>
            </Pressable>
          </View>

          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
            <Text style={styles.disclaimerText}>
              This application is designed for informational purposes only and does not
              provide medical advice, diagnosis, or treatment. Always consult with a
              qualified healthcare provider before making any decisions about medications
              or treatments.
            </Text>
          </View>
        </>
      );
    }

    if (user.isAnonymous) {
      return (
        <>
          <View style={styles.limitedBanner}>
            <Text style={styles.limitedBannerTitle}>Limited Guest Access</Text>
            <Text style={styles.limitedBannerText}>
              Your data will not be saved when you close the app.
            </Text>
            <View style={styles.bannerAction}>
              <Text style={styles.bannerActionText}>
                Create Account to Save Data
              </Text>
            </View>
          </View>

          <View style={styles.authCard}>
            <View style={styles.authTopRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>G</Text>
              </View>

              <View style={styles.authTextBlock}>
                <Text style={styles.authName}>Guest User</Text>
                <Text style={styles.authSubtext}>No account linked</Text>
                <Text style={styles.authSubtextMuted}>Data not saved</Text>
              </View>
            </View>

            <Pressable style={styles.exitGuestButton} onPress={handleExitGuestMode}>
              <Text style={styles.exitGuestButtonText}>Exit Guest Mode</Text>
            </Pressable>
          </View>

          {renderSettingsSection()}
        </>
      );
    }

    return (
      <>
        <View style={styles.authCard}>
          <View style={styles.authTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user.email?.[0] ?? 'U').toUpperCase()}
              </Text>
            </View>

            <View style={styles.authTextBlock}>
              <Text style={styles.authName}>{user.email ?? 'Signed In User'}</Text>
              <Text style={styles.authSubtext}>Signed in</Text>
            </View>
          </View>

          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable>
        </View>

        {renderSettingsSection()}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.deviceFrame}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconButton} />

          <Text style={styles.headerTitle}>
            {!user ? 'Sign In' : 'Profile & Settings'}
          </Text>

          <View style={styles.headerIconButton} />
        </View>

        <View style={styles.content}>
          {renderAuthSection()}
        </View>

        <View style={styles.bottomNav}>
          <Pressable onPress={() => router.replace('/')}>
            <BottomNavItem icon="home-outline" label="Home" />
          </Pressable>
          <BottomNavItem icon="person-outline" label="Profile" active />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f5f9',
  },
  deviceFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: '#f3f5f9',
  },
  headerRow: {
    height: 54,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 14,
  },
  signInCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    alignItems: 'center',
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  welcomeIconText: {
    fontSize: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  providerButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  providerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  appleButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  guestLinkWrap: {
    marginTop: 8,
  },
  guestLink: {
    fontSize: 13,
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
  disclaimerCard: {
    backgroundColor: '#fff7d6',
    borderWidth: 1,
    borderColor: '#f1e3a0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7c6600',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7c6600',
  },
  limitedBanner: {
    backgroundColor: '#fff7d6',
    borderWidth: 1,
    borderColor: '#f1e3a0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  limitedBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7c6600',
    marginBottom: 4,
  },
  limitedBannerText: {
    fontSize: 12,
    color: '#7c6600',
    marginBottom: 8,
  },
  bannerAction: {
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  authTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  authTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4b5563',
  },
  authTextBlock: {
    marginLeft: 12,
    flex: 1,
  },
  authName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  authSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  authSubtextMuted: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  exitGuestButton: {
    marginTop: 12,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  exitGuestButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
  signOutButton: {
    marginTop: 12,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  signOutButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 8,
  },
  settingsGroup: {
    gap: 10,
    marginBottom: 14,
  },
  settingRow: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  settingIconCircleBlue: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  settingIconCircleGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  settingIconCircleGray: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  bottomNav: {
    height: 62,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavText: {
    marginTop: 2,
    fontSize: 11,
    color: '#9ca3af',
  },
  bottomNavTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
});