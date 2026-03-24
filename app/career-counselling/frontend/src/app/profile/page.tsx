"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Loader2, Edit2, Save, User as UserIcon, Wallet, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/types";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const INTEREST_OPTIONS = [
  "Engineering",
  "Medicine / Healthcare",
  "Law",
  "Business / MBA",
  "Computer Science / IT",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Commerce / Finance",
  "Economics",
  "Design / Architecture",
  "Arts & Literature",
  "Social Sciences",
  "Government / Civil Services",
  "Defence",
  "Sports",
  "Media & Journalism",
  "Agriculture",
  "Education / Teaching",
] as const;

const categories = [
  "Open",
  "EWS",
  "OBC-NCL",
  "SC",
  "ST",
  "Open-PwD",
  "EWS-PwD",
  "OBC-NCL-PwD",
  "SC-PwD",
  "ST-PwD",
];

const states = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export default function ProfilePage() {
  const { user: authUser, updateProfilePicture } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [gender, setGender] = useState("");
  const [category, setCategory] = useState("");
  const [homeState, setHomeState] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Onboarding specific states
  const [grade, setGrade] = useState("");
  const [preferredStream, setPreferredStream] = useState("");
  const [targetCollege, setTargetCollege] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [careerGoals, setCareerGoals] = useState("");

  useEffect(() => {
    if (authUser) {
      setProfile({
        id: authUser._id || "",
        email: authUser.email || "",
        firstName: authUser.firstName || "",
        lastName: authUser.lastName || "",
        type: authUser.type || "regular",
        gender: typeof authUser.gender === "string" ? authUser.gender : "",
        category:
          typeof authUser.category === "string" ? authUser.category : "",
        mobileNo:
          typeof authUser.mobileNo === "string" ? authUser.mobileNo : "",
        password:
          typeof authUser.password === "string" ? authUser.password : "",
        isAdmin: Boolean(authUser.isAdmin),
        isExpert: Boolean(authUser.isExpert),
        wallet: Number(authUser.wallet || 0),
        middleName: authUser.middleName,
        onboarding_completed: Boolean(authUser.onboarding_completed),
        following: Array.isArray(authUser.following) ? (authUser.following as string[]) : [],
        followers: Array.isArray(authUser.followers) ? (authUser.followers as string[]) : [],
        profilePicture: typeof authUser.profile_picture_url === "string" ? authUser.profile_picture_url : undefined,
        // Onboarding fields
        grade: authUser.grade || "",
        preferred_stream: authUser.preferred_stream || "",
        target_college: authUser.target_college || "",
        interests: authUser.interests || [],
        career_goals: authUser.career_goals || "",
      });
      setRole(authUser.isAdmin ? "Admin" : authUser.isExpert ? "Expert" : "");
      setGender(typeof authUser.gender === "string" ? authUser.gender : "");
      setCategory(
        typeof authUser.category === "string" ? authUser.category : ""
      );
      setHomeState(
        typeof authUser.home_state === "string" ? authUser.home_state : ""
      );
      setMobileNo(
        typeof authUser.mobileNo === "string" ? authUser.mobileNo : ""
      );
      setFirstName(
        typeof authUser.firstName === "string" ? authUser.firstName : ""
      );
      setMiddleName(
        typeof authUser.middleName === "string" ? authUser.middleName : ""
      );
      setLastName(
        typeof authUser.lastName === "string" ? authUser.lastName : ""
      );
      // Set onboarding specific states
      setGrade(authUser.grade || "");
      setPreferredStream(authUser.preferred_stream || "");
      setTargetCollege(authUser.target_college || "");
      setInterests(authUser.interests || []);
      setCareerGoals(authUser.career_goals || "");
      // Initialise picture preview from stored URL
      if (typeof authUser.profile_picture_url === "string") {
        setPicturePreview(authUser.profile_picture_url);
      }
      setLoading(false);
    } else {
      // Fallback to fetching if not available in context
      fetchProfile();
    }
  }, [authUser]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProfile(response.data);
      setRole(
        response.data.isAdmin ? "Admin" : response.data.isExpert ? "Expert" : ""
      );
      setGender(response.data.gender || "");
      setCategory(response.data.category || "");
      setHomeState(response.data.home_state || "");
      setMobileNo(response.data.mobileNo || "");
      setFirstName(response.data.firstName || "");
      setMiddleName(response.data.middleName || "");
      setLastName(response.data.lastName || "");
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5 MB.");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPicturePreview(localUrl);

    try {
      setUploadingPicture(true);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post("/api/profile/picture", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const newUrl: string = response.data.profile_picture_url;
      // Update local profile state
      setProfile((prev) => prev ? { ...prev, profile_picture_url: newUrl } : prev);
      // Update global auth context so navbar / dashboard update too
      updateProfilePicture(newUrl);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? err.response.data.detail
          : "Failed to upload picture. Please try again.";
      alert(msg);
      setPicturePreview(null);
    } finally {
      setUploadingPicture(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      
      // Separate onboarding fields from regular profile fields
      const profileUpdateData = {
        firstName,
        middleName,
        lastName,
        gender: gender === "unspecified" ? "" : gender,
        category: category === "unspecified" ? "" : category,
        home_state: homeState === "unspecified" ? "" : homeState,
      };
      
      // Only send onboarding fields if they have values
      const onboardingData = {
        grade: grade === "" ? undefined : grade,
        preferred_stream: preferredStream === "" ? undefined : preferredStream,
        target_college: targetCollege === "" ? undefined : targetCollege,
        interests: interests.length === 0 ? undefined : interests,
        career_goals: careerGoals === "" ? undefined : careerGoals,
      };
      
      // Check if we have onboarding data to update
      const hasOnboardingUpdates = Object.values(onboardingData).some(value => value !== undefined);
      
      if (hasOnboardingUpdates) {
        // Send onboarding data to the onboarding endpoint
        await axios.put("/api/onboarding", onboardingData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        // Also update the basic profile fields
        await axios.put("/api/profile", profileUpdateData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        // Only update basic profile fields
        await axios.put("/api/profile", profileUpdateData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      setProfile({
        ...profile!,
        firstName,
        middleName,
        lastName,
        gender,
        category,
        home_state: homeState,
        mobileNo,
        // Update local state with onboarding fields
        grade: grade || "",
        preferred_stream: preferredStream || "",
        target_college: targetCollege || "",
        interests: interests || [],
        career_goals: careerGoals || "",
      });

      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // If loading, show a loading indicator
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no profile, show an error message
  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-red-600">
          Profile information could not be loaded. Please try again later.
        </h1>
      </div>
    );
  }

  // The actual profile content
  const profileContent = (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Profile Hero */}
      <div
        className={`${
          profile.type === "paid"
            ? "bg-gradient-to-r from-amber-600 to-yellow-700"
            : "bg-gradient-to-r from-primary to-primary/80"
        } rounded-lg shadow-lg mb-8 p-8 text-white`}
      >
        <div className="flex items-center space-x-6">
          {/* Avatar with upload overlay */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-24 w-24 ring-4 ring-white/40 shadow-lg">
              <AvatarImage
                src={picturePreview || ""}
                alt={`${profile.firstName} ${profile.lastName}`}
              />
              <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                {profile.firstName?.[0]}{profile.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            {/* Camera button overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPicture}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white text-primary flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors disabled:opacity-60"
              title="Change profile picture"
            >
              {uploadingPicture
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Camera className="h-4 w-4" />
              }
            </button>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePictureUpload}
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              {profile.firstName} {profile.middleName} {profile.lastName}
            </h1>
            <p className="text-sm mt-1 opacity-80">{profile.email}</p>
            <div className="flex items-center space-x-3 mt-2">
              <Badge variant="secondary" className="text-xs">
                {profile.type.charAt(0).toUpperCase() + profile.type.slice(1)}
              </Badge>
              {role && (
                <Badge variant="secondary" className="text-xs">
                  {role}
                </Badge>
              )}
              <Link href="/wallet">
                <Badge
                  variant="secondary"
                  className="text-xs flex items-center cursor-pointer"
                >
                  <Wallet className="h-3 w-3 mr-1" />
                  {profile.wallet || 0} coins
                </Badge>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl text-primary">
              Profile Information
            </CardTitle>
            <Button
              onClick={() =>
                isEditing ? handleUpdateProfile() : setIsEditing(true)
              }
              className={`${
                isEditing
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-primary hover:bg-primary/90"
              }`}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isEditing ? (
                <Save className="h-4 w-4 mr-2" />
              ) : (
                <Edit2 className="h-4 w-4 mr-2" />
              )}
              {isEditing ? "Save Changes" : "Edit Profile"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-primary">
                Personal Information
              </h3>
              <Separator />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input value={profile.email} disabled className="bg-gray-50" />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Middle Name
                </label>
                <Input
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-primary">
                Additional Information
              </h3>
              <Separator />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <Select
                  value={gender || "unspecified"}
                  onValueChange={setGender}
                  disabled={!isEditing}
                >
                  <SelectTrigger className={!isEditing ? "bg-gray-50" : ""}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">Not Specified</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <Select
                  value={category || "unspecified"}
                  onValueChange={setCategory}
                  disabled={!isEditing}
                >
                  <SelectTrigger className={!isEditing ? "bg-gray-50" : ""}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">Not Specified</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat.toLowerCase()}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Home State
                </label>
                <Select
                  value={homeState || "unspecified"}
                  onValueChange={setHomeState}
                  disabled={!isEditing}
                >
                  <SelectTrigger className={!isEditing ? "bg-gray-50" : ""}>
                    <SelectValue placeholder="Select home state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">Not Specified</SelectItem>
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Mobile Number
                  <span className="ml-2 text-xs text-green-600 font-normal">(verified)</span>
                </label>
                <Input
                  type="tel"
                  value={mobileNo}
                  readOnly
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                  placeholder="—"
                />
              </div>
              
              {/* Onboarding Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-primary">
                  Onboarding Information
                </h3>
                <Separator />
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Grade
                  </label>
                  <Select
                    value={grade || "unspecified"}
                    onValueChange={setGrade}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className={!isEditing ? "bg-gray-50" : ""}>
                      <SelectValue placeholder="Select your grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unspecified">Not Specified</SelectItem>
                      <SelectItem value="Grade 9">Grade 9</SelectItem>
                      <SelectItem value="Grade 10">Grade 10</SelectItem>
                      <SelectItem value="Grade 11">Grade 11</SelectItem>
                      <SelectItem value="Grade 12">Grade 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Preferred Stream
                  </label>
                  <Select
                    value={preferredStream || "unspecified"}
                    onValueChange={setPreferredStream}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className={!isEditing ? "bg-gray-50" : ""}>
                      <SelectValue placeholder="Select your stream" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unspecified">Not Specified</SelectItem>
                      <SelectItem value="Science (PCM)">Science (PCM)</SelectItem>
                      <SelectItem value="Science (PCB)">Science (PCB)</SelectItem>
                      <SelectItem value="Commerce">Commerce</SelectItem>
                      <SelectItem value="Arts / Humanities">Arts / Humanities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Target College
                    <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </label>
                  <Input
                    placeholder="e.g. IIT Bombay, AIIMS Delhi, SRCC…"
                    value={targetCollege}
                    onChange={(e) => setTargetCollege(e.target.value)}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Interests
                    <span className="text-gray-400 font-normal text-xs">(pick up to 8)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
                    {INTEREST_OPTIONS.map((interest) => {
                      const selected = interests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setInterests(interests.filter((i) => i !== interest));
                            } else if (interests.length < 8) {
                              setInterests([...interests, interest]);
                            }
                          }}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            selected
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:bg-gray-50 text-gray-700",
                            !selected &&
                              interests.length >= 8 &&
                              "opacity-40 cursor-not-allowed"
                          )}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Career Goals
                    <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </label>
                  <Textarea
                    placeholder="e.g. I want to become a software engineer at a top tech company…"
                    className="resize-none h-20"
                    value={careerGoals}
                    onChange={(e) => setCareerGoals(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Wrap the content with ProtectedRoute
  return <ProtectedRoute>{profileContent}</ProtectedRoute>;
}
