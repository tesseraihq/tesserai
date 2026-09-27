<?php
/**
 * Title: Member callout
 * Slug: tidewater/member-callout
 * Categories: call-to-action
 */
?>
<!-- wp:group {"backgroundColor":"accent-2","style":{"border":{"radius":"var(--wp--custom--radius--lg)"},"spacing":{"padding":{"top":"var:preset|spacing|40","right":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group has-accent-2-background-color has-background">
	<!-- wp:heading {"level":3} -->
	<h3 class="wp-block-heading"><?php esc_html_e( 'Own a share of the store', 'tidewater' ); ?></h3>
	<!-- /wp:heading -->
	<!-- wp:buttons -->
	<div class="wp-block-buttons"><!-- wp:button -->
	<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="/join"><?php esc_html_e( 'Join for $25', 'tidewater' ); ?></a></div>
	<!-- /wp:button --></div>
	<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
