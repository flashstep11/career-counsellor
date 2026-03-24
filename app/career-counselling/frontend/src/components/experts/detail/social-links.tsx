"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  ExternalLink,
  Github,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Twitch,
  Mail,
  Globe,
  Dribbble,
  Figma,
  Codepen,
  Gitlab,
  HashIcon,
} from "lucide-react";

// Map of platform names to their corresponding icons
const socialIcons: Record<string, React.ComponentType<any>> = {
  github: Github,
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  twitch: Twitch,
  email: Mail,
  website: Globe,
  dribbble: Dribbble,
  figma: Figma,
  codepen: Codepen,
  gitlab: Gitlab,
};

interface SocialLinksDrawerProps {
  socialLinks: Record<string, string | undefined>;
}

export function SocialLinksDrawer({ socialLinks }: SocialLinksDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Social Links
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="pt-5">Connect with me</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            {Object.entries(socialLinks).length === 0 ? (
              <div className="text-center text-muted-foreground">
                No social links available yet! 🤷‍♂️
              </div>
            ) : (
              Object.entries(socialLinks).map(([platform, url]) => {
                if (!url) return null;

                // Get the icon component for the platform, or use HashIcon as fallback
                const IconComponent =
                  socialIcons[platform.toLowerCase()] || HashIcon;

                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full"
                  >
                    <Button
                      variant="outline"
                      className="w-full text-lg justify-start h-12"
                    >
                      <IconComponent className="h-5 w-5 mr-2" />
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </Button>
                  </a>
                );
              })
            )}
          </div>
          <div className="p-4">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Close
              </Button>
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
