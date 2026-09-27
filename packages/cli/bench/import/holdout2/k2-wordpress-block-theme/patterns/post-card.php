<?php
/**
 * Title: Post card
 * Slug: fieldnote/post-card
 * Categories: query
 * Inserter: no
 */
?>
<!-- wp:group {"backgroundColor":"base-2","style":{"border":{"radius":"6px","width":"1px","color":"var:preset|color|contrast-3"},"spacing":{"padding":{"top":"var:preset|spacing|40","right":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40"},"blockGap":"var:preset|spacing|20"}},"layout":{"type":"flex","orientation":"vertical"}} -->
<div class="wp-block-group has-border-color has-base-2-background-color has-background" style="border-color:var(--wp--preset--color--contrast-3);border-width:1px;border-radius:6px;padding:var(--wp--preset--spacing--40)">
	<!-- wp:post-date /-->
	<!-- wp:post-title {"isLink":true,"fontSize":"large"} /-->
	<!-- wp:post-excerpt {"excerptLength":24} /-->
	<!-- wp:buttons -->
	<div class="wp-block-buttons">
		<!-- wp:button -->
		<div class="wp-block-button"><a class="wp-block-button__link wp-element-button"><?php esc_html_e( 'Read the note', 'fieldnote' ); ?></a></div>
		<!-- /wp:button -->
	</div>
	<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
