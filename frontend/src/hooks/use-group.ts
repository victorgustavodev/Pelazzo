import { useOutletContext } from 'react-router-dom';
import type { GroupContext } from '../types/api';
export const useGroup = () => useOutletContext<GroupContext>();
