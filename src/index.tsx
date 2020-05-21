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

export type BottomSheetProps = {
    visible: boolean
    children: ReactNode
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
}

type State = {
    visible: boolean
    closing: boolean
    height: number
}

const {height: windowHeight} = Dimensions.get('window');

export default class BottomSheet extends Component<BottomSheetProps, State> {

    static defaultProps = {
        visible: false,
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
    };

    /**
     *
     * @type {object}
     */
    state = {
        visible: this.props.visible,
        closing: false,
        height: windowHeight,
    };

    /**
     *
     * @type {Animated.AnimatedValue}
     */
    overlayAnimation: Animated.AnimatedValue = new Animated.Value(+this.props.visible);

    /**
     *
     * @type {Animated.AnimatedValue}
     */
    contentAnimation: Animated.AnimatedValue = new Animated.Value(+this.props.visible);

    /**
     * Drag animation
     */
    translateY = new Animated.Value(+this.props.visible);

    /**
     *
     * @type {Boolean}
     */
    isOpen: boolean = this.props.visible;

    /**
     * Defines to allow height changing
     */
    allowUpdateHeight: boolean = false;

    /**
     *
     * @type {boolean}
     */
    mount: boolean = false;

    /**
     * Drag responder
     */
    panResponder: PanResponderInstance | null = this.props.onDragDown
        ? PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => false,
            onPanResponderGrant: () => {
            },
            onPanResponderMove: Animated.event(
                [
                    null, {dy: this.translateY},
                ],
                {useNativeDriver: false}
            ),
            onPanResponderRelease: (e, gesture) => {
                const direction = gesture.dy > 0 ? PositionTypes.BOTTOM : PositionTypes.TOP;
                const absDy = Math.abs(gesture.dy);
                const absVy = Math.abs(gesture.vy);
                const {dragClosingDuration, dragClosingHeight, dragClosingVelocity, position} = this.props;
                if (direction === position) {
                    if (
                        this.props.onDragDown
                        && (absVy >= dragClosingVelocity || absDy >= dragClosingHeight * this.state.height)
                    ) {
                        this.props.onDragDown();
                    } else {
                        Animated.timing(this.translateY, {
                            toValue: 0,
                            duration: dragClosingDuration,
                            useNativeDriver: false,
                        }).start();
                    }
                }
            },
        }) : null;

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
    shouldComponentUpdate(nextProps: BottomSheetProps, nextState: State) {
        if (this.props.visible !== nextProps.visible) {
            nextProps.visible ? this.open() : this.close();
            return false;
        }
        return this.state.visible !== nextState.visible
            || this.state.closing !== nextState.closing
            || this.state.height !== nextState.height;
    }

    /**
     * Render component
     *
     * @returns {*}
     */
    render() {
        const {visible, closing, height} = this.state;

        if (!visible) {
            return null;
        }

        const {
            overlayColor,
            onOverlayPress,
            children,
            position,
            dragTopOnly,
            visibleDragIcon,
            contentContainerStyle,
        } = this.props;

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
                                    this.setState({
                                        height: roundedHeight,
                                    }, this.runOpeningAnimation);
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
                        {children}
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

    /**
     *
     * @constructor
     */
    DraggableIcon = () => {
        const {dragIconStyle, dragTopOnly} = this.props;

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
    getAnimationStyles = (position: PositionTypes, height: number) => {
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
    open = async () => {
        this.isOpen = true;

        await this.stopAnimations();

        this.subscribeAndroidBackButton();

        this.allowUpdateHeight = true;

        this.setState({
            visible: true,
            closing: false,
        });
    };

    runOpeningAnimation = () => {
        this.allowUpdateHeight = false;
        const animations = [
            Animated.timing(this.contentAnimation, {
                toValue: 1,
                duration: this.props.showContentDuration,
                easing: this.props.easingIn,
                useNativeDriver: false,
            }),
        ];

        if (this.props.overlayColor !== 'transparent') {
            animations.unshift(
                Animated.timing(this.overlayAnimation, {
                    toValue: 1,
                    duration: this.props.showOverlayDuration,
                    useNativeDriver: false,
                }),
            );
        }

        Animated[this.props.showComposingType](animations).start(({finished}) => {
            if (finished) {
                this.props.onOpen && this.props.onOpen();
            }
        });
    };

    /**
     * Close modal
     */
    close = () => {

        this.isOpen = false;

        this.setState({
            closing: true,
        }, () => {
            this.stopAnimations().then(() => {

                this.unsubscribeAndroidBackButton();

                const animations = [
                    Animated.timing(this.contentAnimation, {
                        toValue: 0,
                        duration: this.props.hideContentDuration,
                        easing: this.props.easingOut,
                        useNativeDriver: false,
                    }),
                ];

                if (this.props.overlayColor !== 'transparent') {
                    animations.push(
                        Animated.timing(this.overlayAnimation, {
                            toValue: 0,
                            duration: this.props.hideOverlayDuration,
                            useNativeDriver: false,
                        }),
                    );
                }

                Animated[this.props.hideComposingType](animations).start(({finished}) => {
                    if (finished) {
                        this.setState({
                            visible: false,
                            closing: false,
                        }, () => {
                            this.translateY.setValue(0);
                            this.props.onClose && this.props.onClose();
                        });
                    }
                });
            });
        });
    };

    /**
     * Android back handler
     *
     * @returns {boolean}
     */
    backHandler = () => {
        if (this.isOpen) {
            this.props.onBackButtonPress && this.props.onBackButtonPress();
            return true;
        }
        return false;
    };

    /**
     *  Stop animations
     *
     * @returns {Promise<void>}
     */
    stopAnimations = async (): Promise<void> => {
        await Promise.all([
            new Promise((resolve) => this.overlayAnimation.stopAnimation(resolve)),
            new Promise((resolve) => this.contentAnimation.stopAnimation(resolve)),
        ]);
    };

    /**
     * Unsubscribe the android back button handler
     */
    unsubscribeAndroidBackButton = () => {
        if (Platform.OS === 'android') {
            BackHandler.removeEventListener('hardwareBackPress', this.backHandler);
        }
    };

    /**
     * Subscribe the android back button handler
     */
    subscribeAndroidBackButton = () => {
        if (Platform.OS === 'android') {
            BackHandler.removeEventListener('hardwareBackPress', this.backHandler);
            BackHandler.addEventListener('hardwareBackPress', this.backHandler);
        }
    };

    /**
     * @override
     * @param state
     * @param callback
     */
    setState = <K extends keyof State>(state: Pick<State, K>, callback?: () => any) => {
        if (this.mount) {
            super.setState(state, callback);
        }
    };
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
