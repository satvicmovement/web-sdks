import { useCallback } from 'react';
import { selectAppDataByPath, useHMSActions, useHMSStore } from '@100mslive/react-sdk';
import { APP_DATA, SM_APP_DATA } from '../../common/constants';

type SetHMSAppDataTyp = {
  key1: string;
  key2?: (typeof SM_APP_DATA)[keyof typeof SM_APP_DATA];
};

/**
 * fields saved related to SM_APP_DATA in store's app data can be
 * accessed using this hook. key is optional if not passed
 * the whole SM_APP_DATA object is returned. Usage -
 * 1. val = useSMAppData(SM_APP_DATA.smChatEnabled);
 *    console.log(val); // false | true
 * 2. val = useSMAppData();
 *    console.log(val); // {smChatEnabled: false | true}
 * @param {string | undefined} smAppDataKey
 */
export const useSMAppData = (smAppDataKey?: (typeof SM_APP_DATA)[keyof typeof SM_APP_DATA]) => {
  const smAppData = useHMSStore(
    smAppDataKey ? selectAppDataByPath(APP_DATA.smAppData, smAppDataKey) : selectAppDataByPath(APP_DATA.smAppData),
  );
  return smAppData;
};

/**
 * fields saved related to SM_APP_DATA in store's app data can be
 * accessed using this hook. key is optional if not passed
 * the whole SM_APP_DATA object is returned. Usage -
 * [val, setVal] = useSMAppData(SM_APP_DATA.smChatEnabled);
 * console.log(val); // false | true
 * setVal(true);
 * @param {string} smAppDataKey
 */
export const useSetSMAppData = (smAppDataKey: (typeof SM_APP_DATA)[keyof typeof SM_APP_DATA]) => {
  const value = useSMAppData(smAppDataKey);
  const setValue = useSetHMSAppData({
    key1: APP_DATA.smAppData,
    key2: smAppDataKey,
  });
  return [value, setValue];
};

const useSetHMSAppData = ({ key1, key2 }: SetHMSAppDataTyp) => {
  const actions = useHMSActions();
  const setValue = useCallback(
    (value: any) => {
      if (!key1) {
        return;
      }
      actions.setAppData(
        key1,
        key2
          ? {
              [key2]: value,
            }
          : value,
        true,
      );
    },
    [actions, key1, key2],
  );
  return setValue;
};
