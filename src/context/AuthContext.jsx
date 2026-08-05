import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const DEFAULT_USERS = {
  student: {
    id: "2025-0014",
    name: "Andrea Tan",
    email: "andrea.tan@sjc.edu.ph",
    role: "student",
    title: "BSIT Student (2nd Year)",
    avatar: "AT",
    course: "BS Information Technology",
    section: "BSIT 2-A",
    yr: 2
  },
  adviser: {
    id: "ADV-101",
    name: "Dr. A. Reyes",
    email: "a.reyes@sjc.edu.ph",
    role: "adviser",
    title: "CCS Academic Adviser & Teacher",
    avatar: "AR",
    department: "College of Computer Studies"
  },
  secretary: {
    id: "SEC-001",
    name: "Engr. M. Cruz",
    email: "m.cruz@sjc.edu.ph",
    role: "secretary",
    title: "Department Secretary",
    avatar: "MC",
    department: "CCS Administrative Office"
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("ccs_auth_user");
    return saved ? JSON.parse(saved) : null;
  });

  const loginAs = (roleKey, customId) => {
    let selectedUser = DEFAULT_USERS[roleKey] || DEFAULT_USERS.secretary;
    if (roleKey === "student" && customId) {
      selectedUser = {
        ...DEFAULT_USERS.student,
        id: customId
      };
    }
    setUser(selectedUser);
    localStorage.setItem("ccs_auth_user", JSON.stringify(selectedUser));
  };

  const updateUserProfile = (updatedFields) => {
    const nextUser = { ...user, ...updatedFields };
    if (updatedFields.name) {
      const initials = updatedFields.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      nextUser.avatar = initials;
    }
    setUser(nextUser);
    localStorage.setItem("ccs_auth_user", JSON.stringify(nextUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ccs_auth_user");
  };

  return (
    <AuthContext.Provider value={{ user, loginAs, logout, updateUserProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
