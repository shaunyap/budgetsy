import os

# 1. Update useAuth.ts
use_auth_path = './src/hooks/useAuth.ts'
with open(use_auth_path, 'r') as f:
    auth_content = f.read()

old_auth = """    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });"""

new_auth = """    const unsubscribe = onAuthStateChanged(auth, (u) => {
      const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL;
      if (u && allowedEmail && u.email !== allowedEmail) {
        console.warn("Unauthorized email attempted to login:", u.email);
        alert(`Unauthorized email. Please login with ${allowedEmail}`);
        signOut(auth);
        setUser(null);
      } else {
        setUser(u);
      }
      setLoading(false);
    });"""

auth_content = auth_content.replace(old_auth, new_auth)
with open(use_auth_path, 'w') as f:
    f.write(auth_content)


# 2. Update Header.tsx
header_path = './src/components/Header.tsx'
with open(header_path, 'r') as f:
    header_content = f.read()

header_content = header_content.replace(
    "import { Settings2, CircleDollarSign } from 'lucide-react';",
    "import { Settings2, CircleDollarSign, LogOut } from 'lucide-react';"
)
header_content = header_content.replace(
    "  onOpenFunding: () => void;\n}",
    "  onOpenFunding: () => void;\n  onLogout: () => void;\n}"
)
header_content = header_content.replace(
    "export const Header: React.FC<HeaderProps> = ({ onOpenEdit, onOpenFunding }) => {",
    "export const Header: React.FC<HeaderProps> = ({ onOpenEdit, onOpenFunding, onLogout }) => {"
)
new_button = """        <button
          onClick={onLogout}
          className="w-10 h-10 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-rose-500 hover:text-white hover:bg-rose-500 hover:border-rose-500 transition-all"
          title="Log Out"
        >
          <LogOut size={20} />
        </button>
      </div>"""
header_content = header_content.replace("      </div>\n    </div>", new_button + "\n    </div>")
with open(header_path, 'w') as f:
    f.write(header_content)


# 3. Update App.tsx
app_path = './src/App.tsx'
with open(app_path, 'r') as f:
    app_content = f.read()

app_content = app_content.replace(
    "const { user, loading: authLoading, loginWithGoogle } = useAuth();",
    "const { user, loading: authLoading, loginWithGoogle, logout } = useAuth();"
)
app_content = app_content.replace(
    "          onOpenFunding={() => setIsFundingModalOpen(true)}\n        />",
    "          onOpenFunding={() => setIsFundingModalOpen(true)}\n          onLogout={logout}\n        />"
)
with open(app_path, 'w') as f:
    f.write(app_content)


# 4. Update .env
with open('.env', 'a') as f:
    f.write("\nVITE_ALLOWED_EMAIL='your.email@gmail.com'\n")
    
print("Auth changes applied!")
