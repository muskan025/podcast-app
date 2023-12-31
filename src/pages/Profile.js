import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Header from "../components/common/Header";
import Button from "../components/common/Button";

import { auth, db, storage } from "../firebase";
import { getAuth, signOut, updateEmail, updateProfile } from "firebase/auth";
import { toast } from "react-toastify";
import Loader from "../components/common/Loader";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { setUser } from "../slices/userSlice";
import InputComponent from "../components/common/input";
import FileInput from "../components/common/input/FileInput";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const Profile = () => {
  const user = useSelector((state) => state.user.user);
  const [userData, setUserData] = useState(null);
  const dispatch = useDispatch();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [originalProfileImage, setOriginalProfileImage] = useState(null);
  useEffect(() => {
    //check if user exist
    if (!user) <Loader />;
    else {
      async function getUserData() {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setUserData(userDoc.data());
      }

      getUserData();
    }
  }, [user]);

  useEffect(() => {
    if (userData) {
      setFullName(userData.name);
      setEmail(userData.email);
      setProfileImage(userData?.photoURL);
      setOriginalProfileImage(userData?.photoURL); // Add this line
    }
  }, [userData]);

  async function updateUserProfile() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    // Check if the profile image has changed
    if (profileImage !== originalProfileImage) {
      // Upload the image to Firebase storage
      const profileImageRef = ref(
        storage,
        `users/${auth.currentUser.uid}/${Date.now()}`
      );
      await uploadBytes(profileImageRef, profileImage);

      // Get a download URL for the uploaded image
      const profileImageUrl = await getDownloadURL(profileImageRef);

      // Update the user's profile in Firebase Auth
      await updateProfile(currentUser, {
        displayName: fullName,
        photoURL: profileImageUrl,
      })
        .then(() => {
          const db = getFirestore();

          // Get a reference to the user's document in Firestore
          const userDocRef = doc(db, "users", currentUser.uid);
          // Update the user's name and photoURL in Firestore
          updateDoc(userDocRef, {
            name: fullName,
            photoURL: profileImageUrl,
          });
          console.log("Before dispatch");
          console.log("Name:", userData.name);
          console.log("Image:", userData.photoURL);
          setProfileImage(userData.photoURL);
          dispatch(
            setUser({
              name: fullName,
              email: email,

              uid: user.uid,
            })
          );
          console.log("After dispatch");
          console.log("Name:", user.name);
          console.log("Image:", user.photoURL);
          // Update the state with the download URL for the uploaded image

          toast.success("Profile updated!");
        })
        .catch((e) => {
          toast.error(e.message);
        });
    } else {
      // Only update the user's name in Firebase Auth and Firestore
      await updateProfile(currentUser, {
        displayName: fullName,
      })
        .then(() => {
          const db = getFirestore();
          const userDocRef = doc(db, "users", currentUser.uid);
          updateDoc(userDocRef, {
            name: fullName,
          });

          dispatch(
            setUser({
              name: fullName,
              email: email,

              uid: user.uid,
            })
          );

          toast.success("Profile updated!");
        })
        .catch((e) => {
          toast.error(e.message);
        });
    }
  }

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        toast.success("User Logged Out!");
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  function handleProfileImage(file) {
    if (file) {
      setProfileImage(file);
    }
  }

  return (
    <div>
      {!user ? (
        <Loader />
      ) : (
        <>
          <Header />
          <div className="profile-div">
            <div className="left-div">
              {profileImage ? (
                <img
                  src={userData.photoURL}
                  
                  className="profile-img"
                />
              ) : userData?.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt="Profile"
                  className="profile-img"
                />
              ) : (
                <div className="profile-placeholder"> </div>
              )}
              <InputComponent
                type="text"
                state={fullName}
                setState={setFullName}
                placeholder=""
                required={true}
                style={{
                  fontSize: "45px",
                  width:"auto",
                  border:"none",     
                  whiteSpace: "normal",
                  wordBreak: "break-word",
              textAlign:"center"
                }}
              >
                {userData?.name}
              </InputComponent>
            </div>
            <div className="right-div">
              
                <InputComponent
                  type="email"
                  state={email}
                  setState={setEmail}
                  placeholder=""
                  required={true}
                  style={{ fontSize: "24px",marginBottom:"35px"}}
                >
                  {userData?.email}
                </InputComponent>
               

              <div className="right">
                <FileInput
                  accept="image/*"
                  id="profile-img-input"
                  fileHandleFnc={handleProfileImage}
                  text="Change Profile Image"
                  fileStyle={{ paddingRight: "13.2rem",}}
                />
                <Button
                  text={"Update Profile"}
                  onClick={updateUserProfile}
                  logOutStyle={{width:"10rem", marginTop:"2.5rem" }}
                />
                <Button
                  text={"Logout"}
                  onClick={handleLogout}
                  logOutStyle={{width:"10rem", marginTop:"1.5rem"}}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;
