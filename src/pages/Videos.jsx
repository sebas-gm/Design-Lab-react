import PublicVideos from './PublicVideos';
import OwnerVideos from './OwnerVideos';
import '../styles/videos.css';

export default function Videos({ manage = false }) {
  return manage ? <OwnerVideos/> : <PublicVideos/>;
}
