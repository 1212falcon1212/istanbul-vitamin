"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Slider } from "@/types";
import { cn } from "@/lib/utils";

interface HeroSliderProps {
  sliders: Slider[];
}

export default function HeroSlider({ sliders }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (index: number) => {
      if (index === current || isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(index);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsTransitioning(false), 700);
    },
    [current, isTransitioning]
  );

  const goNext = useCallback(() => {
    goTo((current + 1) % sliders.length);
  }, [current, sliders.length, goTo]);

  useEffect(() => {
    if (sliders.length <= 1 || isPaused) return;
    const timer = setInterval(goNext, 6000);
    return () => clearInterval(timer);
  }, [goNext, sliders.length, isPaused]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (sliders.length === 0) return null;

  return (
    <section
      className="relative w-full overflow-hidden bg-bg-primary"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative w-full" style={{ aspectRatio: "21/9" }}>
        {sliders.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-in-out",
              index === current ? "opacity-100 z-10" : "opacity-0 z-0"
            )}
          >
            {/* Background image */}
            <Image
              src={slide.image_url}
              alt={slide.title || "İstanbul Vitamin"}
              fill
              sizes="100vw"
              priority={index === 0}
              className="object-cover"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

            {/* Content — left aligned */}
            {(slide.title || slide.subtitle || slide.button_text) && (
              <div className="absolute inset-0 flex items-center z-20">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 w-full">
                  <div className="max-w-xl">
                    {slide.title && (
                      <h2
                        className={cn(
                          "font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white drop-shadow-lg leading-tight",
                          index === current && "animate-fade-in-left"
                        )}
                      >
                        {slide.title}
                      </h2>
                    )}
                    {slide.subtitle && (
                      <p
                        className={cn(
                          "text-base sm:text-lg text-white/90 mt-4 max-w-md drop-shadow leading-relaxed",
                          index === current && "animate-fade-in-left delay-150"
                        )}
                      >
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.button_text && slide.link_url && (
                      <Link
                        href={slide.link_url}
                        className={cn(
                          "inline-flex items-center justify-center mt-6 px-8 py-3 rounded-full",
                          "bg-white text-primary font-medium text-sm sm:text-base",
                          "hover:bg-primary hover:text-white transition-all duration-300",
                          "shadow-lg hover:shadow-xl",
                          index === current && "animate-fade-in-left delay-300"
                        )}
                      >
                        {slide.button_text}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Silent link if no text overlay */}
            {!slide.title && !slide.subtitle && slide.link_url && (
              <Link
                href={slide.link_url}
                className="absolute inset-0 z-20"
                aria-label="Slider baglantisi"
              />
            )}
          </div>
        ))}
      </div>

      {/* Line indicators */}
      {sliders.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          {sliders.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                "h-[3px] rounded-full transition-all duration-500",
                i === current
                  ? "bg-white w-10"
                  : "bg-white/40 hover:bg-white/70 w-5"
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
