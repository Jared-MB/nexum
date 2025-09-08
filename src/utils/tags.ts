interface TagConfig {
	name: string;
	description?: string;
}

type StoreConfig<T extends readonly TagConfig[]> = {
	tags: T;
};

export type ExtractTagNames<T extends readonly TagConfig[]> = T[number]["name"];

// Extract group names from tag names (everything before first colon)
export type ExtractGroupNames<T extends readonly TagConfig[]> =
	T[number]["name"] extends `${infer Group}:${string}` ? Group : never;

export class TagStore<T extends readonly TagConfig[]> {
	private tagsSet: Set<string>;
	private tagsMap: Map<string, TagConfig>;
	private groupsMap: Map<string, Set<string>>; // group -> tags
	private tagToGroupMap: Map<string, string>; // tag -> group

	constructor(private config: StoreConfig<T>) {
		this.tagsSet = new Set(config.tags.map((tag) => tag.name));
		this.tagsMap = new Map(config.tags.map((tag) => [tag.name, tag]));
		this.groupsMap = new Map();
		this.tagToGroupMap = new Map();

		const { tags } = config;

		for (const tag of tags) {
			const colonIndex = tag.name.indexOf(":");

			if (colonIndex > 0) {
				const group = tag.name.substring(0, colonIndex);

				if (!this.groupsMap.has(group)) {
					this.groupsMap.set(group, new Set());
				}
				this.groupsMap.get(group)?.add(tag.name);
				this.tagToGroupMap.set(tag.name, group);
			}
		}
	}
	// Fast lookup for validation
	hasTag(tagName: string): boolean {
		return this.tagsSet.has(tagName);
	}

	// Check if group exists
	hasGroup(groupName: string): boolean {
		return this.groupsMap.has(groupName);
	}

	// Get all tags in a group
	getTagsByGroup(groupName: string): string[] {
		return Array.from(this.groupsMap.get(groupName) || []);
	}

	// Get group for a specific tag
	getTagGroup(tagName: string): string | undefined {
		return this.tagToGroupMap.get(tagName);
	}

	// Get all groups
	getAllGroups(): string[] {
		return Array.from(this.groupsMap.keys());
	}

	// Get standalone tags (no group)
	getStandaloneTags(): string[] {
		return this.config.tags
			.filter((tag) => !tag.name.includes(":"))
			.map((tag) => tag.name);
	}

	// Expand groups to individual tags
	expandGroupsToTags(items: string[]): string[] {
		const expandedTags = new Set<string>();

		for (const item of items) {
			if (this.hasGroup(item)) {
				// It's a group - add all tags from the group
				const groupTags = this.getTagsByGroup(item);
				for (const tag of groupTags) {
					expandedTags.add(tag);
				}
			} else if (this.hasTag(item)) {
				// It's an individual tag
				expandedTags.add(item);
			}
		}

		return Array.from(expandedTags);
	}

	// Validate tags and groups
	validateTagsAndGroups(items: string[]): {
		valid: string[];
		invalid: string[];
		expandedTags: string[];
	} {
		const valid: string[] = [];
		const invalid: string[] = [];

		for (const item of items) {
			if (this.hasTag(item) || this.hasGroup(item)) {
				valid.push(item);
			} else {
				invalid.push(item);
			}
		}

		const expandedTags = this.expandGroupsToTags(valid);

		return { valid, invalid, expandedTags };
	}

	// Get tag metadata
	getTag(tagName: string): TagConfig | undefined {
		return this.tagsMap.get(tagName);
	}

	// Get all available tags
	getAllTags(): TagConfig[] {
		return Array.from(this.tagsMap.values());
	}

	// Debug helper - show group structure
	getGroupStructure(): Record<string, string[]> {
		const structure: Record<string, string[]> = {};

		this.groupsMap.forEach((tags, group) => {
			structure[group] = Array.from(tags);
		});

		return structure;
	}
}
