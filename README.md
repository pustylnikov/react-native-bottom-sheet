### Install
using npm
```text
npm install @anvilapp/react-native-bottom-sheet --save
```
or using yarn
```text
yarn add @anvilapp/react-native-bottom-sheet
```

### Usage example
```jsx
import BottomSheet, {ComposingTypes, PositionTypes} from '@anvilapp/react-native-bottom-sheet';

const bottomSheetRef = React.createRef();

<BottomSheet
    ref={bottomSheetRef}
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
    onBackButtonPress={() => console.log('onBackButtonPress')}
    onOverlayPress={() => console.log('onOverlayPress')}
    onDragDown={() => console.log('onDragDown')}
/>

bottomSheetRef.current.open({
    render: () => {
        // Use any of your components
        return <BottomSheetContent/>;
    }
    // extra options
});
```
