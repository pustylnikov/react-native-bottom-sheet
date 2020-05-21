import React, {useState} from 'react';
import {Button, SafeAreaView, StatusBar, StyleSheet, Text, View} from 'react-native';

import BottomSheet, {ComposingTypes, PositionTypes} from '../src';

const App = () => {

    const [visible, setVisible] = useState(false);

    return (
        <>
            <StatusBar barStyle="dark-content"/>
            <SafeAreaView>
                <Button
                    title="Show Bottom Sheet"
                    onPress={() => setVisible(true)}
                />
            </SafeAreaView>
            <BottomSheet
                visible={visible}
                showComposingType={ComposingTypes.PARALLEL}
                hideComposingType={ComposingTypes.PARALLEL}
                position={PositionTypes.BOTTOM}
                showOverlayDuration={150}
                hideOverlayDuration={150}
                showContentDuration={150}
                hideContentDuration={150}
                dragTopOnly={true}
                visibleDragIcon={true}
                onBackButtonPress={() => setVisible(false)}
                onOverlayPress={() => setVisible(false)}
                onDragDown={() => setVisible(false)}
            >
                <View style={styles.contentView}>
                    <View style={styles.titleView}>
                        <Text style={styles.titleText}>Fusce ligula metus</Text>
                        <Text style={styles.subTitleText}>
                            Sed ullamcorper elit in nisi pellentesque, quis sagittis urna interdum
                        </Text>
                    </View>
                </View>
            </BottomSheet>
        </>
    );
};

const styles = StyleSheet.create({
    contentView: {
        height: 300,
    },
    titleView: {
        paddingHorizontal: 40,
        paddingVertical: 10,
    },
    titleText: {
        fontSize: 18,
        color: '#222',
        textAlign: 'center',
    },
    subTitleText: {
        fontSize: 12,
        color: '#222',
        textAlign: 'center',
    },
    draggableIcon: {
        width: 35,
        height: 5,
        borderRadius: 5,
        marginVertical: 10,
        backgroundColor: '#ccc',
        alignSelf: 'center',
    },
});

export default App;
