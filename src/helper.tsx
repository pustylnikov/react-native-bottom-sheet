import BottomSheet, {BottomSheetProperties} from './index';

let bottomSheetRef: BottomSheet | null = null;

export function setBottomSheetRef(ref: BottomSheet) {
    bottomSheetRef = ref;
}

export function openBottomSheet(properties: BottomSheetProperties): Promise<boolean> | undefined {
    if (bottomSheetRef) {
        return bottomSheetRef.open(properties);
    }
}

export function closeBottomSheet(): Promise<boolean> | undefined {
    if (bottomSheetRef) {
        return bottomSheetRef.close();
    }
}
