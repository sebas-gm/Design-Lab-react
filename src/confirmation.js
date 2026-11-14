import { createContext, useContext } from "react";
export const ConfirmationContext = createContext(null);
export const useConfirm = () => useContext(ConfirmationContext);
