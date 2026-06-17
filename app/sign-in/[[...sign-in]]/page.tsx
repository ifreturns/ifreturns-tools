import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 25 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24.507 9.5l-.034-.09L21.082.57a.748.748 0 00-1.418.019l-2.096 6.406H7.43L5.334.59a.748.748 0 00-1.418-.02L.484 9.411.45 9.5a5.29 5.29 0 001.762 6.106l.009.007.024.018 4.361 3.261 2.157 1.63 1.312.99a.872.872 0 001.03 0l1.312-.99 2.157-1.63 4.393-3.28.01-.007A5.29 5.29 0 0024.507 9.5z" fill="#E24329"/>
          </svg>
          <span className="text-xl font-bold text-gray-800">GitLab Epic Board</span>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
