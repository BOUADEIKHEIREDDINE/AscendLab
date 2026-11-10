/**
 * Sign up / Log in with email and password, or with Google.
 * A new account continues onboarding; an existing account goes straight to Home.
 */
import React, { useState } from 'react';
import { Keyboard, Platform, ScrollView, View } from 'react-native';
import { AuthRepository, AuthResult } from '../../../data/authRepo';
import { ProfileRepository } from '../../../data/profileRepo';
import { Onboarding } from '../../../state/session';
import { finishOnboarding, useNav, useParams } from '../../../navigation/types';
import { palette } from '../../theme';
import { Appear, Button, Hairline, IconButton, PrimaryButton, Screen, T, TextField } from '../../components/core';

const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

export function SignUpScreen() {
  const nav = useNav();
  const { logIn } = useParams<'SignUp'>();
  const [isLogIn, setIsLogIn] = useState(!!logIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handle(result: AuthResult) {
    if (result.kind === 'success') {
      // A returning person may have finished setup already (go Home) or stopped
      // halfway (resume onboarding with their earlier answers filled in).
      const saved = result.isNewUser ? null : await ProfileRepository.load();
      setLoading(false);
      if (saved?.onboardingComplete) {
        finishOnboarding(nav);
      } else {
        Onboarding.resumeFrom(saved);
        nav.reset({ index: 0, routes: [{ name: 'ChooseVersion' }] });
      }
      return;
    }
    if (result.kind === 'error') setError(result.message);
    setLoading(false);
  }

  function submit() {
    Keyboard.dismiss();
    setInfo(null);
    const problem = !EMAIL.test(email.trim()) ? 'Enter a valid email address.'
      : password.length < 6 ? 'Password must be at least 6 characters.' : null;
    setError(problem);
    if (problem) return;
    setLoading(true);
    (isLogIn ? AuthRepository.logIn(email, password) : AuthRepository.signUp(email, password)).then(handle);
  }

  async function forgot() {
    setError(null);
    if (!EMAIL.test(email.trim())) {
      setError('Enter your email above, then tap Forgot password.');
      return;
    }
    setLoading(true);
    const result = await AuthRepository.sendPasswordReset(email);
    setLoading(false);
    if (result.kind === 'error') setError(result.message);
    else setInfo('Reset link sent. Check your inbox.');
  }

  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: 16 }}>
        {nav.canGoBack() && (
          <View style={{ marginLeft: -12 }}>
            <IconButton name={Platform.OS === 'ios' ? 'arrow-back-ios-new' : 'arrow-back'} size={Platform.OS === 'ios' ? 20 : 24} label="Back" onPress={() => nav.goBack()} />
          </View>
        )}
        {/* The heading changes when switching between sign up and log in. */}
        <Appear key={isLogIn ? 'login' : 'signup'}>
          <View style={{ gap: 8 }}>
            <T v="headline">{isLogIn ? 'Welcome back' : 'Create your account'}</T>
            <T v="body" color={palette.textMuted}>
              {isLogIn ? 'Log in to pick up where you left off.' : 'Your plan, your pace. It takes a minute.'}
            </T>
          </View>
        </Appear>

        <View style={{ height: 8 }} />
        <TextField
          label="Email"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(null); }}
          editable={!loading}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={(t) => { setPassword(t); setError(null); }}
          editable={!loading}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isLogIn ? 'current-password' : 'new-password'}
          textContentType={isLogIn ? 'password' : 'newPassword'}
          returnKeyType="done"
          onSubmitEditing={submit}
          hint={isLogIn ? undefined : 'At least 6 characters'}
          right={<IconButton name={showPassword ? 'visibility-off' : 'visibility'} label={showPassword ? 'Hide password' : 'Show password'}
            color={palette.textMuted} onPress={() => setShowPassword(!showPassword)} />}
        />

        {error && <T color={palette.error}>{error}</T>}
        {info && <T color={palette.lime}>{info}</T>}

        <PrimaryButton label={isLogIn ? 'Log in' : 'Sign up'} onPress={submit} loading={loading} />
        {isLogIn && <Button kind="text" label="Forgot password?" onPress={forgot} enabled={!loading} />}

        {AuthRepository.googleAvailable && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}><Hairline /></View>
              <T v="label" color={palette.textMuted}>or</T>
              <View style={{ flex: 1 }}><Hairline /></View>
            </View>
            <Button
              label="Continue with Google"
              icon="mc:google"
              enabled={!loading}
              style={{ height: 52 }}
              onPress={() => {
                setError(null);
                setLoading(true);
                AuthRepository.signInWithGoogle().then(handle);
              }}
            />
          </>
        )}

        <Button
          kind="text"
          label={isLogIn ? 'New here? Create an account' : 'Already have an account? Log in'}
          enabled={!loading}
          onPress={() => { setIsLogIn(!isLogIn); setError(null); setInfo(null); }}
        />
      </ScrollView>
    </Screen>
  );
}
