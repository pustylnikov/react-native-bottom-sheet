import React from 'react';
import {Button, SafeAreaView, StatusBar, StyleSheet, Text, View} from 'react-native';

import BottomSheet, {ComposingTypes, PositionTypes} from '../src';
import {closeBottomSheet, openBottomSheet, setBottomSheetRef} from '../src/helper';

const BottomSheetContent = () => (
    <View style={styles.contentView}>
        <View style={styles.titleView}>
            <Text style={styles.titleText}>Fusce ligula metus</Text>
            <Text style={styles.subTitleText}>
                Sed ullamcorper elit in nisi pellentesque, quis sagittis urna interdum
            </Text>
        </View>
    </View>
);

const BottomSheetBigContent = () => (
    <View style={styles.contentBigView}>
        <View style={styles.titleView}>
            <Text style={styles.titleText}>Fusce ligula metus</Text>
            <Text style={styles.subTitleText}>
                Sed ullamcorper elit in nisi pellentesque, quis sagittis urna interdum
            </Text>
        </View>
    </View>
);

const App = () => {
    return (
        <>
            <StatusBar barStyle="dark-content"/>

            <SafeAreaView style={styles.containerView}>
                <View style={styles.buttonView}>
                    <Button
                        title="Show Bottom Sheet"
                        onPress={() => {
                            openBottomSheet({
                                render: () => <BottomSheetContent/>,
                            });
                        }}
                    />
                </View>
                <View style={styles.buttonView}>
                    <Button
                        title="Show No Draggable Bottom Sheet"
                        onPress={() => openBottomSheet({
                            render: () => <BottomSheetBigContent/>,
                            draggable: false,
                            visibleDragIcon: false,
                        })}
                    />
                </View>
            </SafeAreaView>

            <BottomSheet
                ref={setBottomSheetRef}
                showComposingType={ComposingTypes.PARALLEL}
                hideComposingType={ComposingTypes.PARALLEL}
                position={PositionTypes.BOTTOM}
                showOverlayDuration={150}
                hideOverlayDuration={150}
                showContentDuration={150}
                hideContentDuration={150}
                dragTopOnly={true}
                visibleDragIcon={true}
                draggable
                onBackButtonPress={() => closeBottomSheet()}
                onOverlayPress={() => closeBottomSheet()}
                onDragDown={() => closeBottomSheet()}
            />
        </>
    );
};

const styles = StyleSheet.create({
    containerView: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    buttonView: {
        marginVertical: 10,
    },
    contentView: {
        height: 300,
    },
    contentBigView: {
        height: 500,
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
});

export default App;
