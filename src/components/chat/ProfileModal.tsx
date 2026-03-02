import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { X, Camera, Loader2 } from "lucide-react";
import ChatAvatar from "./Avatar";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const ProfileModal = ({ open, onClose }: ProfileModalProps) => {
  const { profile, user } = useAuth();
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState((profile as any)?.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar must be under 5MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user || !username.trim()) {
      setError("Username is required");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      let avatarUrl = profile?.avatar_url || null;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `avatars/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("chat-files")
          .upload(path, avatarFile, { upsert: true });

        if (uploadErr) {
          setError("Failed to upload avatar");
          setSaving(false);
          return;
        }

        const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          avatar_url: avatarUrl,
          bio: bio.trim() || null,
        })
        .eq("id", user.id);

      if (updateErr) {
        setError(updateErr.message);
      } else {
        setSuccess(true);
        // Force re-fetch profile in AuthContext
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch {
      setError("Something went wrong");
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Edit Profile</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-border" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-border">
                    <span className="text-3xl font-bold text-primary">
                      {username?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="Your username"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
                placeholder="Tell something about yourself..."
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/200</p>
            </div>

            {/* Error / Success */}
            {error && <p className="text-destructive text-sm text-center bg-destructive/10 rounded-xl py-2 px-3">{error}</p>}
            {success && <p className="text-online text-sm text-center bg-online/10 rounded-xl py-2 px-3">Profile updated!</p>}

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving || !username.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProfileModal;
