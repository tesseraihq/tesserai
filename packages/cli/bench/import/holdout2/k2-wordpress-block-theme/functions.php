<?php
/**
 * Fieldnote functions and definitions.
 *
 * @package Fieldnote
 */

if ( ! function_exists( 'fieldnote_setup' ) ) {
	function fieldnote_setup() {
		add_theme_support( 'wp-block-styles' );
		add_editor_style( 'assets/css/editor.css' );
	}
}
add_action( 'after_setup_theme', 'fieldnote_setup' );

function fieldnote_register_blocks() {
	register_block_type( __DIR__ . '/build/blocks/menu-card' );
}
add_action( 'init', 'fieldnote_register_blocks' );
