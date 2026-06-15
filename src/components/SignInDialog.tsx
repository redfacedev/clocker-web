import './SignInDialog.css';

interface Props {
  onGoogleSignIn: () => void;
  onGithubSignIn: () => void;
  onClose: () => void;
}

function SignInDialog({ onGoogleSignIn, onGithubSignIn, onClose }: Props) {
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog sign-in-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Sign In</h2>
        </div>
        <button className="btn-sign-in-provider" onClick={onGoogleSignIn}>
          Sign in with <span style={{fontWeight: 900}}>Google</span>
        </button>
        <button className="btn-sign-in-provider" onClick={onGithubSignIn}>
          Sign in with <span style={{fontWeight: 900}}>GitHub</span>
        </button>
        <div style={{display: 'flex', justifyContent: 'center', marginTop: '16px'}}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default SignInDialog;
