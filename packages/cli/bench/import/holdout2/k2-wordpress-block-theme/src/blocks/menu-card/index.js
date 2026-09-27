import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps, RichText } from "@wordpress/block-editor";
import metadata from "./block.json";
import "./style.scss";

registerBlockType(metadata.name, {
	edit({ attributes, setAttributes }) {
		return (
			<div {...useBlockProps()}>
				<RichText tagName="span" value={attributes.drink} onChange={(drink) => setAttributes({ drink })} />
				<RichText tagName="span" className="wp-block-fieldnote-menu-card__price" value={attributes.price} onChange={(price) => setAttributes({ price })} />
			</div>
		);
	},
	save({ attributes }) {
		return (
			<div {...useBlockProps.save()}>
				<RichText.Content tagName="span" value={attributes.drink} />
				<RichText.Content tagName="span" className="wp-block-fieldnote-menu-card__price" value={attributes.price} />
			</div>
		);
	},
});
