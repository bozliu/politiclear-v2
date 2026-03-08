import { StyleSheet, Text } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { openExternalUrl } from "../utils/externalLinks";

export default function Link({label, url}) {
    
    const go = async () => {
        await openExternalUrl(url, {
            sourceLabel: label,
        });
    }

    return (
        <TouchableOpacity accessibilityRole="link" accessibilityLabel={label} onPress={go}>
            <Text style={styles.social_media}>{label}</Text>
        </TouchableOpacity>
    )

}

const styles = StyleSheet.create({
    social_media: {
        textDecorationLine: "underline",
        marginLeft: 15
    }
})
