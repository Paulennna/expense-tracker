import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabaseClient';
import { THEME } from '../_layout';

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const processUrl = async (url) => {
            if (!url) return;

            console.log('Processing deep link:', url);

            // Extract tokens from the URL (Supabase appends them as a hash: #access_token=...)
            let access_token = null;
            let refresh_token = null;

            const hashRegex = /#(.+)/;
            const match = url.match(hashRegex);
            if (match) {
                const params = match[1].split('&');
                params.forEach(param => {
                    const [key, val] = param.split('=');
                    if (key === 'access_token') access_token = val;
                    if (key === 'refresh_token') refresh_token = val;
                });
            }

            if (access_token && refresh_token) {
                console.log('Found magic link tokens! Setting session...');
                const { error } = await supabase.auth.setSession({
                    access_token,
                    refresh_token,
                });

                if (error) {
                    console.error("Error setting session:", error.message);
                } else {
                    // The root _layout.js might automatically redirect, but we can do it explicitly directly too
                    router.replace('/(tabs)');
                }
            } else {
                // If it's a callback but no token was provided, just send them back
                router.replace('/auth/sign-in');
            }
        };

        // Grab the URL that opened the app
        Linking.getInitialURL().then(processUrl);

        // Listen for URLs if the app is already open
        const subscription = Linking.addEventListener('url', ({ url }) => processUrl(url));

        return () => {
            subscription.remove();
        };
    }, []);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={styles.text}>Logging you in...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: THEME.text,
        marginTop: 16,
        fontSize: 16,
    },
});
