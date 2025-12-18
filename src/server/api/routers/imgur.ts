import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";
import extractLinkInfo from "~/utils/link-cleaner";
import { TRPCError } from "@trpc/server";

const DIRECT_IMGUR_HOST = "https://i.imgur.com";
const ALBUM_ENDPOINT = (albumId: string) =>
  `https://imgur.com/ajaxalbums/getimages/${albumId}/hit.json?all=true`;
const IMAGE_ENDPOINT = (imageId: string) => `https://imgur.com/${imageId}.json`;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imgur.plen.io";
const IMGUR_HEADERS = {
  Accept: "application/json",
  "User-Agent": `ImgurDirectLinksBot/1.0 (+${SITE_URL})`,
  Referer: "https://imgur.com/",
};

interface LegacyAlbumResponse {
  data?: {
    images?: Array<{
      hash?: string;
      ext?: string;
      link?: string;
    }>;
  };
  status?: number;
  success?: boolean;
}

interface LegacyImageResponse {
  data?: {
    image?: {
      hash?: string;
      ext?: string;
      link?: string;
      url?: string;
      links?: {
        original?: string;
      };
    };
  };
  status?: number;
  success?: boolean;
}

const buildDirectLink = (
  hash?: string | null,
  ext?: string | null,
  fallback?: string | null,
) => {
  if (hash && ext) {
    const normalizedExt = ext.startsWith(".") ? ext : `.${ext}`;
    return `${DIRECT_IMGUR_HOST}/${hash}${normalizedExt}`;
  }
  if (fallback && fallback.startsWith("http")) {
    return fallback;
  }
  return null;
};

export const imgurRouter = createTRPCRouter({
  getLinks: publicProcedure
    .input(
      z.object({
        url: z.string().refine((value) => extractLinkInfo(value) !== null, {
          message: "Invalid URL format",
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const linkInfo = extractLinkInfo(input.url);
      if (!linkInfo) {
        console.error(`URL: ${input.url}`);
        console.error(`[imgur.getLinks] Invalid URL format`);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid URL format",
        });
      }
      const { albumId, linkType } = linkInfo;
      
      // Sanitize albumId to prevent path traversal and injection attacks
      // Only allow alphanumeric characters, dashes, and underscores
      const sanitizedAlbumId = albumId.replace(/[^a-zA-Z0-9_-]/g, "");
      if (!sanitizedAlbumId || sanitizedAlbumId !== albumId) {
        console.error(`URL: ${input.url}`);
        console.error(`[imgur.getLinks] Invalid album ID format - Original: ${albumId}, Sanitized: ${sanitizedAlbumId}`);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid album/image ID format",
        });
      }
      
      // Ensure linkType is only 'album' or 'image' to prevent injection
      const sanitizedLinkType = linkType === "album" ? "album" : "image";
      
      const apiUrl =
        sanitizedLinkType === "album"
          ? ALBUM_ENDPOINT(sanitizedAlbumId)
          : IMAGE_ENDPOINT(sanitizedAlbumId);

      let response: Response;
      try {
        response = await fetch(apiUrl, {
          headers: IMGUR_HEADERS,
        });
      } catch (err) {
        console.error(`URL: ${input.url}`);
        console.error(
          `[imgur.getLinks] Network error while contacting Imgur - API URL: ${apiUrl}, Error:`,
          err,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to reach Imgur. Please try again shortly.",
        });
      }

      if (!response.ok) {
        let errorMessage = "Failed to fetch image data";
        if (response.status === 404) {
          errorMessage = "Album or image not found. Please check the URL.";
        } else if (response.status === 403) {
          errorMessage = "Access forbidden. The album may be private or deleted.";
        }

        console.error(`URL: ${input.url}`);
        console.error(
          `[imgur.getLinks] Legacy endpoint error - Status: ${response.status}, API URL: ${apiUrl}`,
        );

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMessage,
        });
      }

      if (sanitizedLinkType === "album") {
        let jsonResponse: LegacyAlbumResponse;
        try {
          jsonResponse = (await response.json()) as LegacyAlbumResponse;
        } catch (err) {
          console.error(`URL: ${input.url}`);
          console.error(
            `[imgur.getLinks] Album JSON parse error - API URL: ${apiUrl}, Error:`,
            err,
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to parse Imgur response as JSON",
          });
        }

        const images = jsonResponse.data?.images ?? [];
        const links = images
          .map((image) => buildDirectLink(image.hash, image.ext, image.link))
          .filter((link): link is string => typeof link === "string");

        if (links.length === 0) {
          console.error(`URL: ${input.url}`);
          console.error(
            `[imgur.getLinks] No images found in album response - API URL: ${apiUrl}`,
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to extract images from album.",
          });
        }

        return links.join("\n");
      }

      let jsonResponse: LegacyImageResponse;
      try {
        jsonResponse = (await response.json()) as LegacyImageResponse;
      } catch (err) {
        console.error(`URL: ${input.url}`);
        console.error(
          `[imgur.getLinks] Image JSON parse error - API URL: ${apiUrl}, Error:`,
          err,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to parse Imgur response as JSON",
        });
      }

      const image = jsonResponse.data?.image;
      const directLink =
        image?.links?.original ??
        buildDirectLink(
          image?.hash ?? null,
          image?.ext ?? null,
          image?.link ?? image?.url ?? null,
        );

      if (!directLink) {
        console.error(`URL: ${input.url}`);
        console.error(
          `[imgur.getLinks] Unable to construct direct link - API URL: ${apiUrl}, Image: ${JSON.stringify(
            image,
          )}`,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to extract direct image link.",
        });
      }

      return directLink;
    }),
});

export type ImgurRouter = typeof imgurRouter;
