import {
    Accessibility,
    Activity,
    AlertOctagon,
    AlertTriangle,
    ArrowUpDown,
    Baby,
    Brain,
    CarFront,
    DoorClosed,
    Ear,
    Eye,
    Grip,
    HelpCircle,
    type LucideIcon,
    MapPin,
    MoreHorizontal,
    TrendingUp,
    User,
    VolumeX
} from "lucide-react";

const IconMap: Record<string, LucideIcon> = {
    TrendingUp,
    ArrowUpDown,
    AlertTriangle,
    AlertOctagon,
    DoorClosed,
    Grip,
    Activity,
    VolumeX,
    MoreHorizontal,
    CarFront,
    Accessibility,
    Eye,
    Ear,
    Brain,
    Baby,
    User,
    HelpCircle,
    MapPin
};

export const getDynamicIcon = (iconName: string | undefined | null): LucideIcon => {
    if (!iconName) return MapPin;
    return IconMap[iconName] || MapPin;
};