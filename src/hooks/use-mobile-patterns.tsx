import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Mobile-First Design Patterns Hook
 * Provides standardized responsive classes and patterns
 */
export const useMobilePatterns = () => {
  const isMobile = useIsMobile();

  return {
    // Container patterns
    container: "p-3 md:p-6 max-w-[1600px] mx-auto",
    section: "space-y-4 md:space-y-6",
    
    // Typography scale
    h1: "text-2xl md:text-4xl font-bold",
    h2: "text-xl md:text-3xl font-semibold",
    h3: "text-lg md:text-2xl font-semibold",
    body: "text-sm md:text-base",
    small: "text-xs md:text-sm",
    
    // Touch targets (minimum 44px)
    button: {
      sm: "h-11 min-h-[44px] px-3 md:h-9",
      default: "h-11 min-h-[44px] px-4 md:h-10",
      lg: "h-12 min-h-[44px] px-6 md:h-11",
      icon: "h-11 w-11 min-h-[44px] min-w-[44px] md:h-10 md:w-10"
    },
    
    input: "h-11 min-h-[44px] text-base md:h-10 md:text-sm",
    select: "h-11 min-h-[44px] md:h-10",
    
    // Grid patterns
    grid: {
      cards: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6",
      stats: "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4",
      twoCol: "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
    },
    
    // Flex patterns
    flex: {
      stack: "flex flex-col gap-3 md:gap-4",
      row: "flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4",
      between: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
    },
    
    // Card patterns
    card: {
      base: "bg-white/90 backdrop-blur-sm rounded-lg shadow-sm",
      padding: "p-4 md:p-6",
      compact: "p-3 md:p-4"
    },
    
    // Safe areas
    safeArea: {
      top: "pt-safe",
      bottom: "pb-safe",
      both: "pt-safe pb-safe"
    },
    
    // Helper: Check if mobile
    isMobile,
    
    // Helper: Conditional classes
    mobile: (mobileClass: string, desktopClass: string = "") => 
      isMobile ? mobileClass : desktopClass,
  };
};

/**
 * Mobile Navigation Pattern
 * Use Drawer on mobile, regular UI on desktop
 */
export const mobileNavPattern = (isMobile: boolean) => ({
  wrapper: isMobile ? "Drawer" : "div",
  trigger: isMobile ? "DrawerTrigger" : "button",
  content: isMobile ? "DrawerContent" : "div"
});
