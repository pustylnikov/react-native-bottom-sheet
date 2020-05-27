import React, {Component, ReactNode} from 'react';
import {
    Animated,
    BackHandler,
    Dimensions,
    Easing,
    EasingFunction,
    Platform,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
    PanResponder,
    PanResponderInstance, ViewStyle,
} from 'react-native';

export enum ComposingTypes {
    PARALLEL = 'parallel',
    SEQUENCE = 'sequence',
}

export enum PositionTypes {
    BOTTOM = 'bottom',
    TOP = 'top',
}

export type BottomSheetProperties = Partial<Omit<BottomSheetProps, 'propsAreEqual'>> & {
    render: () => ReactNode
}

export type BottomSheetProps = {
    overlayColor: string
    showOverlayDuration: number
    showContentDuration: number
    hideOverlayDuration: number
    hideContentDuration: number
    dragClosingHeight: number
    dragClosingVelocity: number
    dragClosingDuration: number
    dragTopOnly: boolean
    visibleDragIcon: boolean
    draggable: boolean
    position: PositionTypes
    showComposingType: ComposingTypes
    hideComposingType: ComposingTypes
    easingIn: EasingFunction
    easingOut: EasingFunction
    onClose?: () => void
    onOpen?: () => void
    onBackButtonPress?: () => void
    onOverlayPress?: () => void
    onDragDown?: () => void
    dragIconStyle?: ViewStyle
    contentContainerStyle?: ViewStyle
    propsAreEqual?: (prevProps: Readonly<BottomSheetProps>, nextProps: Readonly<BottomSheetProps>) => boolean
}

type PreparedProperties = Omit<BottomSheetProps, 'propsAreEqual'> & {
    render: () => ReactNode
}

type BottomSheetState = {
    visible: boolean
    closing: boolean
    height: number
}

const {height: windowHeight} = Dimensions.get('window');

export default class BottomSheet extends Component<BottomSheetProps, BottomSheetState> {

    static defaultProps = {
        overlayColor: 'rgba(0, 0, 0, 0.3)',
        showOverlayDuration: 150,
        hideOverlayDuration: 150,
        showContentDuration: 300,
        hideContentDuration: 300,
        dragClosingHeight: 0.7,
        dragClosingVelocity: 0.4,
        dragClosingDuration: 150,
        dragTopOnly: true,
        visibleDragIcon: true,
        position: PositionTypes.BOTTOM,
        showComposingType: ComposingTypes.PARALLEL,
        hideComposingType: ComposingTypes.PARALLEL,
        easingIn: Easing.ease,
        easingOut: Easing.ease,
        draggable: true,
    };

    /**
     *
     * @type {object}
     */
    state = {
        visible: false,
        closing: false,
        height: windowHeight,
    };

    /**
     *
     * @type {Animated.AnimatedValue}
     */
    protected overlayAnimation: Animated.AnimatedValue = new Animated.Value(0);

    /**
     *
     * @type {Animated.AnimatedValue}
     */
    protected contentAnimation: Animated.AnimatedValue = new Animated.Value(0);

    /**
     * Drag animation
     */
    protected translateY = new Animated.Value(0);

    /**
     *
     * @type {Boolean}
     */
    protected isOpen: boolean = false;

    /**
     * Defines to allow height changing
     */
    protected allowUpdateHeight: boolean = false;

    /**
     *
     * @type {boolean}
     */
    protected mount: boolean = false;

    /**
     * Sheet properties
     */
    protected properties?: PreparedProperties;

    /**
     * Open promise resolver
     */
    protected openResolver?: (finished: boolean) => void;

    /**
     * Drag responder
     */
    protected panResponder: PanResponderInstance = PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: () => {
            return !!(this.properties && this.properties.draggable);
        },
        onPanResponderMove: Animated.event(
            [
                null, {dy: this.translateY},
            ],
            {useNativeDriver: false}
        ),
        onPanResponderRelease: (e, gesture) => {
            if (!this.properties) {
                return;
            }
            const direction = gesture.dy > 0 ? PositionTypes.BOTTOM : PositionTypes.TOP;
            const absDy = Math.abs(gesture.dy);
            const absVy = Math.abs(gesture.vy);
            const {dragClosingDuration, dragClosingHeight, dragClosingVelocity, position, onDragDown} = this.properties;
            if (direction === position) {
                if (
                    onDragDown
                    && (absVy >= dragClosingVelocity || absDy >= dragClosingHeight * this.state.height)
                ) {
                    onDragDown();
                } else {
                    Animated.timing(this.translateY, {
                        toValue: 0,
                        duration: dragClosingDuration,
                        useNativeDriver: false,
                    }).start();
                }
            }
        },
    });

    /**
     *
     * @constructor
     */
    DraggableIcon = () => {
        if (!this.properties) {
            return null;
        }

        const {dragIconStyle, dragTopOnly} = this.properties;

        return (
            <View
                {...(dragTopOnly && this.panResponder ? this.panResponder.panHandlers : null)}
                style={styles.draggableView}
                hitSlop={{top: 20, bottom: 20, left: 0, right: 0}}
            >
                <View style={[styles.draggableIcon, dragIconStyle]}/>
            </View>
        );
    }

    /**
     *  Returns animation styles
     */
    protected getAnimationStyles = (position: PositionTypes, height: number) => {
        switch (position) {
            case PositionTypes.TOP:
                return {
                    top: this.contentAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-height, 0],
                    }),
                };
            case PositionTypes.BOTTOM:
                return {
                    bottom: this.contentAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-height, 0],
                    }),
                };
        }
    };

    /**
     * Open modal
     */
    public open = (properties: BottomSheetProperties): Promise<boolean> => {
        return new Promise(async (resolve) => {
            if (this.isOpen) {
                await this.close();
            }
            this.translateY.setValue(0);
            this.isOpen = true;

            this.properties = {
                ...this.props,
                ...properties,
            };

            await this.stopAnimations();
            this.subscribeAndroidBackButton();
            this.allowUpdateHeight = true;
            await this.setState({
                visible: true,
                closing: false,
                height: windowHeight,
            });
            this.openResolver = (finished) => resolve(finished);
        });
    };

    /**
     * Start opening animation
     */
    protected runOpeningAnimation = () => {
        if (!this.properties) {
            return;
        }

        this.allowUpdateHeight = false;
        const animations = [
            Animated.timing(this.contentAnimation, {
                toValue: 1,
                duration: this.properties.showContentDuration,
                easing: this.properties.easingIn,
                useNativeDriver: false,
            }),
        ];

        if (this.properties.overlayColor !== 'transparent') {
            animations.unshift(
                Animated.timing(this.overlayAnimation, {
                    toValue: 1,
                    duration: this.properties.showOverlayDuration,
                    useNativeDriver: false,
                }),
            );
        }

        Animated[this.properties.showComposingType](animations).start(({finished}) => {
            if (finished) {
                this.properties?.onOpen && this.properties.onOpen();
            }
            this.openResolver && this.openResolver(finished);
            this.openResolver = undefined;
        });
    };

    /**
     * Close modal
     */
    public close = (): Promise<boolean> => {
        return new Promise(async (resolve) => {
            await this.setState({closing: true});
            await this.stopAnimations();
            this.unsubscribeAndroidBackButton();

            if (!this.properties) {
                return resolve(false);
            }

            const animations = [
                Animated.timing(this.contentAnimation, {
                    toValue: 0,
                    duration: this.properties.hideContentDuration,
                    easing: this.properties.easingOut,
                    useNativeDriver: false,
                }),
            ];

            if (this.properties.overlayColor !== 'transparent') {
                animations.push(
                    Animated.timing(this.overlayAnimation, {
                        toValue: 0,
                        duration: this.properties.hideOverlayDuration,
                        useNativeDriver: false,
                    }),
                );
            }

            Animated[this.properties.hideComposingType](animations).start(async ({finished}) => {
                if (finished) {
                    await this.setState({
                        visible: false,
                        closing: false,
                        height: windowHeight,
                    });
                    this.properties?.onClose && this.properties.onClose();
                }
                this.isOpen = false;
                this.properties = undefined;
                resolve(finished);
                this.translateY.setValue(0);
            });
        });
    };

    /**
     * Android back handler
     *
     * @returns {boolean}
     */
    protected backHandler = () => {
        if (this.isOpen) {
            this.properties?.onBackButtonPress && this.properties.onBackButtonPress();
            return true;
        }
        return false;
    };

    /**
     *  Stop animations
     *
     * @returns {Promise<void>}
     */
    protected stopAnimations = async (): Promise<void> => {
        await Promise.all([
            new Promise((resolve) => this.overlayAnimation.stopAnimation(resolve)),
            new Promise((resolve) => this.contentAnimation.stopAnimation(resolve)),
        ]);
    };

    /**
     * Unsubscribe the android back button handler
     */
    protected unsubscribeAndroidBackButton = () => {
        if (Platform.OS === 'android') {
            BackHandler.removeEventListener('hardwareBackPress', this.backHandler);
        }
    };

    /**
     * Subscribe the android back button handler
     */
    protected subscribeAndroidBackButton = () => {
        if (Platform.OS === 'android') {
            BackHandler.removeEventListener('hardwareBackPress', this.backHandler);
            BackHandler.addEventListener('hardwareBackPress', this.backHandler);
        }
    };

    /**
     * @override
     * @param state
     */
    public setState = <K extends keyof BottomSheetState>(state: Pick<BottomSheetState, K>): Promise<void> => {
        return new Promise((resolve) => {
            if (this.mount) {
                super.setState(state, resolve);
            } else {
                resolve();
            }
        });
    };

    /**
     * Mount
     */
    componentDidMount() {
        this.mount = true;
    }

    /**
     * Unmount
     */
    componentWillUnmount() {
        this.stopAnimations().then();
        this.unsubscribeAndroidBackButton();
        this.mount = false;
    }

    /**
     *
     * @param {object} nextProps
     * @param {object} nextState
     * @returns {boolean}
     */
    shouldComponentUpdate(nextProps: BottomSheetProps, nextState: BottomSheetState) {
        const {propsAreEqual} = this.props;
        const {visible, height, closing} = this.state;
        return !(
            visible === nextState.visible
            && height === nextState.height
            && closing === nextState.closing
            && (propsAreEqual ? propsAreEqual(this.props, nextProps) : true)
        );
    }

    /**
     * Render component
     *
     * @returns {*}
     */
    render() {
        const {visible, closing, height} = this.state;

        if (!visible || !this.properties) {
            return null;
        }

        const {
            overlayColor,
            onOverlayPress,
            render,
            position,
            dragTopOnly,
            visibleDragIcon,
            contentContainerStyle,
        } = this.properties;

        const animationStyles = this.getAnimationStyles(position, height);

        return (
            <View style={styles.containerView}>
                <TouchableWithoutFeedback
                    onPress={closing ? undefined : onOverlayPress}
                >
                    {
                        overlayColor !== 'transparent' ? <Animated.View
                            style={[
                                styles.overlayView,
                                {
                                    backgroundColor: overlayColor,
                                    opacity: this.overlayAnimation,
                                },
                            ]}
                        /> : <View style={styles.overlayView}/>
                    }

                </TouchableWithoutFeedback>
                <Animated.View
                    pointerEvents={closing ? 'none' : 'box-none'}
                    style={[
                        styles.contentAnimatedView,
                        animationStyles,
                        {
                            transform: [
                                {
                                    translateY: this.translateY.interpolate({
                                        inputRange: [-1, 0, 1],
                                        outputRange: position === PositionTypes.TOP ? [-1, 0, 0] : [0, 0, 1],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <View
                        {...(!dragTopOnly && this.panResponder ? this.panResponder.panHandlers : null)}
                        style={[
                            position === PositionTypes.TOP ? styles.contentTopView : styles.contentBottomView,
                            contentContainerStyle,
                        ]}
                        onLayout={({nativeEvent: {layout: {height: layoutHeight}}}) => {
                            if (this.allowUpdateHeight) {
                                this.allowUpdateHeight = false;
                                const roundedHeight = Math.round(layoutHeight);
                                if (roundedHeight !== height) {
                                    this.setState({height: roundedHeight}).then(this.runOpeningAnimation);
                                } else {
                                    this.runOpeningAnimation();
                                }
                            }
                        }}
                    >
                        {
                            visibleDragIcon && position === PositionTypes.BOTTOM ? (
                                <this.DraggableIcon/>
                            ) : null
                        }
                        {render()}
                        {
                            visibleDragIcon && position === PositionTypes.TOP ? (
                                <this.DraggableIcon/>
                            ) : null
                        }
                    </View>
                </Animated.View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    containerView: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        elevation: 999,
        zIndex: 10000,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayView: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    contentAnimatedView: {
        position: 'absolute',
        width: '100%',
    },
    contentTopView: {
        width: '100%',
        backgroundColor: '#fff',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    contentBottomView: {
        width: '100%',
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    draggableView: {
        width: '100%',
        zIndex: 1,
        position: 'relative',
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
