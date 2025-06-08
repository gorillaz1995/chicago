// This is a reference schema for Sanity Studio
// Place this in your Sanity studio project under schemas/

import { defineType, defineField } from "sanity";

export const adSchema = defineType({
  name: "ad",
  title: "Community Ad",
  type: "document",
  icon: () => "📢",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) =>
        Rule.required()
          .max(100)
          .error("Title is required and must be less than 100 characters"),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) =>
        Rule.required().error("Slug is required for the URL"),
    }),
    defineField({
      name: "type",
      title: "Ad Type",
      type: "string",
      options: {
        list: [
          { title: "Business Sponsor", value: "business" },
          { title: "Help Request", value: "help" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required().error("Please select an ad type"),
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "string",
      validation: (Rule) =>
        Rule.required().max(50).error("Location is required"),
    }),
    defineField({
      name: "fullAddress",
      title: "Full Address",
      type: "text",
      rows: 2,
      validation: (Rule) => Rule.required().error("Full address is required"),
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: "alt",
          title: "Alt Text",
          type: "string",
          validation: (Rule) =>
            Rule.custom((alt, context) => {
              if (context.parent?.asset && !alt) {
                return "Alt text is required when image is present";
              }
              return true;
            }),
        },
      ],
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "Quote", value: "blockquote" },
          ],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
              { title: "Underline", value: "underline" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  {
                    name: "href",
                    type: "url",
                    title: "URL",
                  },
                ],
              },
            ],
          },
        },
      ],
      validation: (Rule) =>
        Rule.required().min(1).error("Description is required"),
    }),
    // Business-specific fields
    defineField({
      name: "phone",
      title: "Phone Number",
      type: "string",
      hidden: ({ document }) => document?.type !== "business",
      validation: (Rule) =>
        Rule.custom((phone, context) => {
          if (context.document?.type === "business" && !phone) {
            return "Phone number is required for business ads";
          }
          if (
            phone &&
            !/^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ""))
          ) {
            return "Please enter a valid phone number";
          }
          return true;
        }),
    }),
    defineField({
      name: "email",
      title: "Email Address",
      type: "email",
      hidden: ({ document }) => document?.type !== "business",
      validation: (Rule) =>
        Rule.custom((email, context) => {
          if (context.document?.type === "business" && !email) {
            return "Email address is required for business ads";
          }
          return true;
        }),
    }),
    // Help-specific fields
    defineField({
      name: "bankAccount",
      title: "Bank Account for Donations",
      type: "string",
      description: "Bank account details where donations can be sent",
      hidden: ({ document }) => document?.type !== "help",
      validation: (Rule) =>
        Rule.custom((bankAccount, context) => {
          if (context.document?.type === "help" && !bankAccount) {
            return "Bank account information is required for help request ads";
          }
          return true;
        }),
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "location",
      type: "type",
      media: "image",
    },
    prepare({ title, subtitle, type, media }) {
      return {
        title,
        subtitle: `${type === "business" ? "🏢" : "🤝"} ${subtitle}`,
        media,
      };
    },
  },
  orderings: [
    {
      title: "Created Date, New",
      name: "createdDesc",
      by: [{ field: "_createdAt", direction: "desc" }],
    },
    {
      title: "Created Date, Old",
      name: "createdAsc",
      by: [{ field: "_createdAt", direction: "asc" }],
    },
    {
      title: "Title A-Z",
      name: "titleAsc",
      by: [{ field: "title", direction: "asc" }],
    },
  ],
});

export default adSchema;
