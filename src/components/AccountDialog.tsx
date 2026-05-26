import type { User } from 'firebase/auth';

interface Props {
  user: User;
  onClose: () => void;
}

function AccountDialog({ user, onClose }: Props) {
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Account</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="setting">
          <p><strong>Account Name:</strong> {user.displayName}</p>
        </div>
      </div>
    </div>
  );
}

export default AccountDialog;
